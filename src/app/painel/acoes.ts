"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarPeriodo, horaParaMinutos, paraInstante } from "@/lib/tempo";
import { linkWhatsApp, mensagemAprovada, mensagemNaoAprovada, soDigitos } from "@/lib/whatsapp";

export type Resultado = { erro: string } | { ok: true; link: string | null; mensagem: string };

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

export type DadosReserva = {
  id?: number;
  salaId: string;
  data: string;
  inicio: string;
  fim: string;
  pastoral: string;
  atividade: string;
  pessoas: number;
  responsavel: string;
  telefone: string;
  buscarChave: boolean;
};

// Reserva avulsa criada ou alterada pela secretaria: entra já confirmada.
export async function salvarReserva(dados: DadosReserva): Promise<Resultado> {
  const usuario = await exigirEquipe();
  const periodo = montarPeriodo(dados.data, dados.inicio, dados.fim);
  if (!periodo) return { erro: "Confira a data e o horário: o término precisa ser depois do início." };
  if (!dados.salaId) return { erro: "Escolha uma sala." };
  if (!dados.pastoral.trim()) return { erro: "Escreva a pastoral ou grupo." };
  if (!dados.atividade.trim()) return { erro: "Escreva a atividade." };
  if (!dados.responsavel.trim()) return { erro: "Escreva o nome do responsável." };
  const telefone = soDigitos(dados.telefone);
  if (telefone && (telefone.length < 10 || telefone.length > 13)) return { erro: "Confira o telefone (com DDD)." };

  const supabase = await criarClienteServidor();
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

export async function cancelarReserva(id: number): Promise<Resultado> {
  await exigirEquipe();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("reservas").update({ situacao: "cancelada" }).eq("id", id).eq("situacao", "confirmada");
  if (error) return { erro: traduzirErro(error) };
  atualizarTelas();
  return { ok: true, mensagem: "", link: null };
}
