"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoForm } from "@/app/acoes-auth";
import { exigirAdmin } from "@/lib/dados";
import { criarClienteServico, criarClienteServidor } from "@/lib/supabase/server";
import { RECURSOS } from "@/lib/tipos";
import { soDigitos } from "@/lib/whatsapp";

const texto = (dados: FormData, campo: string) => String(dados.get(campo) ?? "").trim();

// ---------------------------------------------------------------- Salas

export async function salvarSala(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const id = texto(dados, "id");
  const nome = texto(dados, "nome");
  const cor = texto(dados, "cor");
  const capacidade = Number(texto(dados, "capacidade"));
  if (!nome) return { erro: "Escreva o nome da sala." };
  if (!/^#[0-9a-fA-F]{6}$/.test(cor)) return { erro: "Escolha uma cor." };
  if (!Number.isInteger(capacidade) || capacidade < 0) return { erro: "A capacidade precisa ser um número." };

  const linha = {
    nome,
    cor,
    capacidade,
    localizacao: texto(dados, "localizacao"),
    recursos: dados.getAll("recursos").map(String).filter((r) => (RECURSOS as readonly string[]).includes(r)),
    precisa_chave: dados.get("precisa_chave") === "sim",
    observacoes: texto(dados, "observacoes"),
    ativa: dados.get("ativa") !== "nao",
    ordem: Number(texto(dados, "ordem")) || 0,
  };

  const supabase = await criarClienteServidor();
  if (id) {
    const { error } = await supabase.from("salas").update(linha).eq("id", id);
    if (error) return { erro: "Não foi possível salvar a sala." };
    revalidatePath("/", "layout");
    return { ok: "Sala salva." };
  }
  const { data, error } = await supabase.from("salas").insert(linha).select("id").single();
  if (error) return { erro: "Não foi possível cadastrar a sala." };
  revalidatePath("/", "layout");
  redirect(`/admin/salas/${data.id}?nova=1`);
}

// ---------------------------------------------------------------- Usuários

export async function cadastrarUsuario(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const nome = texto(dados, "nome");
  const email = texto(dados, "email").toLowerCase();
  const senha = String(dados.get("senha") ?? "");
  const perfil = dados.get("perfil") === "admin" ? "admin" : "editor";
  if (!nome || !email) return { erro: "Preencha o nome e o e-mail." };
  if (senha.length < 8) return { erro: "A senha provisória precisa ter pelo menos 8 caracteres." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { erro: "Falta configurar a chave SUPABASE_SERVICE_ROLE_KEY no servidor." };

  const servico = criarClienteServico();
  const { data, error } = await servico.auth.admin.createUser({ email, password: senha, email_confirm: true });
  if (error || !data.user) {
    return { erro: error?.message.includes("already") ? "Já existe um usuário com este e-mail." : "Não foi possível cadastrar." };
  }
  const { error: erroPerfil } = await servico.from("usuarios").insert({ id: data.user.id, nome, email, perfil });
  if (erroPerfil) {
    await servico.auth.admin.deleteUser(data.user.id);
    return { erro: "Não foi possível salvar o perfil do usuário." };
  }
  revalidatePath("/admin/usuarios");
  return { ok: `${nome} cadastrado. Passe o e-mail e a senha provisória para a pessoa; ela pode trocar em "Esqueci minha senha".` };
}

export async function mudarPerfil(id: string, perfil: "editor" | "admin"): Promise<EstadoForm> {
  const atual = await exigirAdmin();
  if (id === atual.id) return { erro: "Você não pode mudar o seu próprio perfil." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("usuarios").update({ perfil }).eq("id", id);
  if (error) return { erro: "Não foi possível mudar o perfil." };
  revalidatePath("/admin/usuarios");
  return { ok: "Perfil alterado." };
}

export async function removerUsuario(id: string): Promise<EstadoForm> {
  const atual = await exigirAdmin();
  if (id === atual.id) return { erro: "Você não pode remover a si mesmo." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { erro: "Falta configurar a chave SUPABASE_SERVICE_ROLE_KEY no servidor." };
  const { error } = await criarClienteServico().auth.admin.deleteUser(id);
  if (error) return { erro: "Não foi possível remover o usuário." };
  revalidatePath("/admin/usuarios");
  return { ok: "Usuário removido." };
}

// ---------------------------------------------------------------- Configurações

export async function salvarConfiguracoes(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  let whatsapp = soDigitos(texto(dados, "whatsapp"));
  if (whatsapp.length === 10 || whatsapp.length === 11) whatsapp = `55${whatsapp}`;
  if (whatsapp.length < 12 || whatsapp.length > 13) return { erro: "Confira o número do WhatsApp: código do país, DDD e número." };
  const abertura = texto(dados, "abertura");
  const fechamento = texto(dados, "fechamento");
  if (!abertura || !fechamento || fechamento <= abertura) return { erro: "O horário de fechamento precisa ser depois da abertura." };
  const nome = texto(dados, "nome");
  if (!nome) return { erro: "Escreva o nome da paróquia." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("configuracoes")
    .update({
      nome_paroquia: nome,
      whatsapp_secretaria: whatsapp,
      hora_abertura: abertura,
      hora_fechamento: fechamento,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { erro: "Não foi possível salvar as configurações." };
  revalidatePath("/", "layout");
  return { ok: "Configurações salvas." };
}

export async function limparDadosPessoais(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const antes = texto(dados, "antes");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(antes)) return { erro: "Escolha a data." };
  if (dados.get("confirmo") !== "sim") return { erro: "Marque a caixa de confirmação." };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("limpar_dados_pessoais", { p_antes_de: antes });
  if (error) return { erro: "Não foi possível limpar os dados." };
  return { ok: `Pronto: nome e telefone apagados de ${data ?? 0} pedido(s).` };
}
