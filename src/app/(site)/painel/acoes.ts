"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarData, formatarHora, formatarPeriodo, horaParaMinutos, paraInstante } from "@/lib/tempo";
import { descreverRegra, descreverTermino, type Regra, type Termino } from "@/lib/recorrencia";
import { linkWhatsApp, mensagemAprovada, mensagemNaoAprovada, mensagemSerieAprovada, soDigitos } from "@/lib/whatsapp";

export type Resultado = { erro: string } | { ok: true; link: string | null; mensagem: string; resumo?: string };

const MSG_CONFLITO = "Esta sala já tem uma reserva confirmada neste horário. Troque a sala ou o horário.";

function traduzirErro(error: { code?: string; message: string }) {
  if (error.code === "23P01") return MSG_CONFLITO;
  if (error.code === "23514") return "Confira o horário: o término precisa ser depois do início.";
  return "Não foi possível salvar. Tente de novo.";
}

function montarPeriodo(data: string, inicio: string, fim: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) return null;
  if (horaParaMinutos(fim) <= horaParaMinutos(inicio)) return null;
  return { inicio: paraInstante(data, inicio), fim: paraInstante(data, fim) };
}

function atualizarTelas() {
  revalidatePath("/", "layout");
}

export async function confirmarPedido(dados: {
  id: number;
  buscarChave: boolean;
  salaId: string;
  data: string;
  inicio: string;
  fim: string;
}): Promise<Resultado> {
  const usuario = await exigirEquipe();
  const supabase = await criarClienteServidor();

  const { data: pedido } = await supabase
    .from("reservas")
    .select("id, sala_id, inicio, fim, pastoral, telefone, situacao, salas(nome)")
    .eq("id", dados.id)
    .maybeSingle();
  if (!pedido || pedido.situacao !== "pendente") return { erro: "Este pedido já foi tratado por outra pessoa." };

  const periodo = montarPeriodo(dados.data, dados.inicio, dados.fim);
  if (!periodo) return { erro: "Confira a data e o horário." };

  const { data: novaSala } = await supabase.from("salas").select("nome").eq("id", dados.salaId).maybeSingle();
  if (!novaSala) return { erro: "Escolha uma sala." };

  const { error } = await supabase
    .from("reservas")
    .update({
      situacao: "confirmada",
      sala_id: dados.salaId,
      inicio: periodo.inicio,
      fim: periodo.fim,
      buscar_chave: dados.buscarChave,
      decidido_por: usuario.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", dados.id)
    .eq("situacao", "pendente");
  if (error) return { erro: traduzirErro(error) };

  const salaAntes = (pedido.salas as unknown as { nome: string } | null)?.nome ?? "";
  const mudouSala = pedido.sala_id !== dados.salaId;
  const mudouHorario =
    new Date(pedido.inicio).getTime() !== new Date(periodo.inicio).getTime() ||
    new Date(pedido.fim).getTime() !== new Date(periodo.fim).getTime();

  const mensagem = mensagemAprovada({
    id: dados.id,
    sala: novaSala.nome,
    inicio: periodo.inicio,
    fim: periodo.fim,
    pastoral: pedido.pastoral,
    buscarChave: dados.buscarChave,
    mudancas: {
      salaAntes: mudouSala ? salaAntes : undefined,
      periodoAntes: mudouHorario ? formatarPeriodo(pedido.inicio, pedido.fim).texto : undefined,
    },
  });
  atualizarTelas();
  return { ok: true, mensagem, link: pedido.telefone ? linkWhatsApp(pedido.telefone, mensagem) : null };
}

export async function recusarPedido(dados: { id: number; motivo: string }): Promise<Resultado> {
  const usuario = await exigirEquipe();
  const motivo = dados.motivo.trim();
  if (!motivo) return { erro: "Escreva o motivo. Ele vai na mensagem para quem pediu." };

  const supabase = await criarClienteServidor();
  const { data: pedido, error } = await supabase
    .from("reservas")
    .update({
      situacao: "recusada",
      motivo_recusa: motivo,
      decidido_por: usuario.id,
      decidido_em: new Date().toISOString(),
    })
    .eq("id", dados.id)
    .eq("situacao", "pendente")
    .select("id, inicio, fim, pastoral, telefone, salas(nome)")
    .maybeSingle();
  if (error) return { erro: traduzirErro(error) };
  if (!pedido) return { erro: "Este pedido já foi tratado por outra pessoa." };

  const mensagem = mensagemNaoAprovada({
    id: pedido.id,
    sala: (pedido.salas as unknown as { nome: string } | null)?.nome ?? "",
    inicio: pedido.inicio,
    fim: pedido.fim,
    pastoral: pedido.pastoral,
    motivo,
  });
  atualizarTelas();
  return { ok: true, mensagem, link: pedido.telefone ? linkWhatsApp(pedido.telefone, mensagem) : null };
}


export type Escopo = "este" | "proximos" | "todos";

type CamposComuns = {
  pastoral: string;
  atividade: string;
  pessoas: number;
  responsavel: string;
  telefone: string;
  buscarChave: boolean;
};

export type DadosReserva = CamposComuns & {
  id?: number;
  escopo?: Escopo; // só para reservas de uma série
  salaId: string;
  data: string;
  inicio: string;
  fim: string;
};

function validarComuns(dados: CamposComuns): { erro: string } | { telefone: string } {
  if (!dados.pastoral.trim()) return { erro: "Escreva a pastoral ou grupo." };
  if (!dados.atividade.trim()) return { erro: "Escreva a atividade." };
  if (!dados.responsavel.trim()) return { erro: "Escreva o nome do responsável." };
  const telefone = soDigitos(dados.telefone);
  if (telefone && (telefone.length < 10 || telefone.length > 13)) return { erro: "Confira o telefone (com DDD)." };
  return { telefone };
}

// Reserva avulsa criada ou alterada pela secretaria: entra já confirmada.
// Numa série, "este e os próximos" e "todos" mantêm o dia de cada encontro.
export async function salvarReserva(dados: DadosReserva): Promise<Resultado> {
  const usuario = await exigirEquipe();
  const periodo = montarPeriodo(dados.data, dados.inicio, dados.fim);
  if (!periodo) return { erro: "Confira a data e o horário: o término precisa ser depois do início." };
  if (!dados.salaId) return { erro: "Escolha uma sala." };
  const validacao = validarComuns(dados);
  if ("erro" in validacao) return validacao;
  const { telefone } = validacao;

  const supabase = await criarClienteServidor();

  if (dados.id && dados.escopo && dados.escopo !== "este") {
    const { data: total, error } = await supabase.rpc("editar_serie", {
      p_reserva_id: dados.id,
      p_escopo: dados.escopo,
      p_sala_id: dados.salaId,
      p_hora_inicio: dados.inicio,
      p_hora_fim: dados.fim,
      p_pastoral: dados.pastoral,
      p_atividade: dados.atividade,
      p_pessoas: Math.max(0, Math.floor(dados.pessoas || 0)),
      p_responsavel: dados.responsavel,
      p_telefone: telefone,
      p_buscar_chave: dados.buscarChave,
    });
    if (error) {
      if (error.code === "23P01")
        return { erro: "Algum encontro da série bateria com outra reserva confirmada. Nada foi alterado. Troque a sala ou o horário." };
      return { erro: traduzirErro(error) };
    }
    atualizarTelas();
    return { ok: true, mensagem: "", link: null, resumo: `${total} encontro(s) da série alterado(s).` };
  }

  const linha = {
    sala_id: dados.salaId,
    inicio: periodo.inicio,
    fim: periodo.fim,
    pastoral: dados.pastoral.trim(),
    atividade: dados.atividade.trim(),
    pessoas: Math.max(0, Math.floor(dados.pessoas || 0)),
    responsavel: dados.responsavel.trim(),
    telefone: telefone || null,
    buscar_chave: dados.buscarChave,
  };

  const resposta = dados.id
    ? await supabase.from("reservas").update(linha).eq("id", dados.id).select("id, salas(nome)").single()
    : await supabase
        .from("reservas")
        .insert({
          ...linha,
          situacao: "confirmada",
          origem: "secretaria",
          criado_por: usuario.id,
          decidido_por: usuario.id,
          decidido_em: new Date().toISOString(),
        })
        .select("id, salas(nome)")
        .single();
  if (resposta.error) return { erro: traduzirErro(resposta.error) };

  const mensagem = mensagemAprovada({
    id: resposta.data.id,
    sala: (resposta.data.salas as unknown as { nome: string } | null)?.nome ?? "",
    inicio: periodo.inicio,
    fim: periodo.fim,
    pastoral: linha.pastoral,
    buscarChave: dados.buscarChave,
  });
  atualizarTelas();
  return { ok: true, mensagem, link: telefone ? linkWhatsApp(telefone, mensagem) : null };
}

export type DadosSerie = CamposComuns & {
  regra: Regra;
  termino: Termino;
  primeiraData: string;
  inicio: string; // "19:00"
  fim: string;
  encontros: { data: string; salaId: string }[];
};

// Cria a série e todos os encontros de uma vez (ou nada, se houver conflito).
export async function criarSerie(dados: DadosSerie): Promise<Resultado> {
  await exigirEquipe();
  if (dados.encontros.length === 0) return { erro: "Nenhuma data marcada para salvar." };
  if (!/^\d{2}:\d{2}$/.test(dados.inicio) || !/^\d{2}:\d{2}$/.test(dados.fim) || horaParaMinutos(dados.fim) <= horaParaMinutos(dados.inicio))
    return { erro: "Confira o horário: o término precisa ser depois do início." };
  const validacao = validarComuns(dados);
  if ("erro" in validacao) return validacao;
  const { telefone } = validacao;

  const supabase = await criarClienteServidor();
  const { data: salas } = await supabase.from("salas").select("id, nome");
  const nomes = new Map((salas ?? []).map((s) => [s.id, s.nome]));
  if (dados.encontros.some((e) => !nomes.has(e.salaId) || !/^\d{4}-\d{2}-\d{2}$/.test(e.data)))
    return { erro: "Confira as salas e as datas." };

  const ordenados = [...dados.encontros].sort((a, b) => a.data.localeCompare(b.data));
  const { error } = await supabase.rpc("criar_serie", {
    p_regra: { ...dados.regra, termino: dados.termino },
    p_data_inicio: dados.primeiraData,
    p_data_fim: dados.termino.tipo === "data" ? dados.termino.ate : null,
    p_num_encontros: dados.termino.tipo === "quantidade" ? dados.termino.total : null,
    p_pastoral: dados.pastoral,
    p_atividade: dados.atividade,
    p_pessoas: Math.max(0, Math.floor(dados.pessoas || 0)),
    p_responsavel: dados.responsavel,
    p_telefone: telefone,
    p_encontros: ordenados.map((e) => ({
      sala_id: e.salaId,
      inicio: paraInstante(e.data, dados.inicio),
      fim: paraInstante(e.data, dados.fim),
      buscar_chave: dados.buscarChave,
    })),
  });
  if (error) {
    if (error.code === "23P01")
      return { erro: "Alguma data acabou de ser ocupada por outra reserva. Nada foi salvo. Toque em “Ver as datas” de novo." };
    return { erro: "Não foi possível salvar a série. Tente de novo." };
  }

  // Na mensagem, a sala mais usada; trocas pontuais aparecem entre parênteses.
  const contagem = new Map<string, number>();
  ordenados.forEach((e) => contagem.set(e.salaId, (contagem.get(e.salaId) ?? 0) + 1));
  const principal = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const mensagem = mensagemSerieAprovada({
    descricao: `${descreverRegra(dados.regra, dados.primeiraData)}, ${descreverTermino(dados.termino)}`,
    sala: nomes.get(principal) ?? "",
    pastoral: dados.pastoral.trim(),
    horario: `das ${formatarHora(dados.inicio)} às ${formatarHora(dados.fim)}`,
    datas: ordenados.map((e) => formatarData(e.data) + (e.salaId === principal ? "" : ` (${nomes.get(e.salaId)})`)),
    buscarChave: dados.buscarChave,
  });
  atualizarTelas();
  return {
    ok: true,
    mensagem,
    link: telefone ? linkWhatsApp(telefone, mensagem) : null,
    resumo: `${ordenados.length} encontro(s) salvos na agenda.`,
  };
}

export async function cancelarReserva(id: number, escopo: Escopo = "este"): Promise<Resultado> {
  await exigirEquipe();
  const supabase = await criarClienteServidor();
  const { data: total, error } = await supabase.rpc("cancelar_reservas", { p_reserva_id: id, p_escopo: escopo });
  if (error) return { erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true, mensagem: "", link: null, resumo: `${total} encontro(s) cancelado(s).` };
}
