import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/server";
import { missasNoPeriodo, type Missa, type MissaAvulsa, type MissaPadrao } from "./missas";
import type { Configuracoes, EventoPublico, Perfil, Sala } from "./tipos";

export type UsuarioAtual = { id: string; nome: string; email: string; perfil: Perfil };

export const obterUsuario = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("usuarios").select("id, nome, email, perfil").eq("id", user.id).maybeSingle();
  return data;
});

export async function exigirEquipe() {
  const usuario = await obterUsuario();
  if (!usuario) redirect("/entrar");
  return usuario;
}

export async function exigirAdmin() {
  const usuario = await exigirEquipe();
  if (usuario.perfil !== "admin") redirect("/painel");
  return usuario;
}

const CONFIG_PADRAO: Configuracoes = {
  nome_paroquia: "Paróquia",
  whatsapp_secretaria: "551934212290",
  hora_abertura: "07:00",
  hora_fechamento: "22:00",
};

export const obterConfig = cache(async (): Promise<Configuracoes> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_paroquia, whatsapp_secretaria, hora_abertura, hora_fechamento")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return CONFIG_PADRAO;
  return { ...data, hora_abertura: data.hora_abertura.slice(0, 5), hora_fechamento: data.hora_fechamento.slice(0, 5) };
});

export const listarSalas = cache(async (incluirInativas = false): Promise<Sala[]> => {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("salas")
    .select("*, fotos_sala(id, sala_id, caminho, ordem)")
    .order("ordem")
    .order("nome")
    .order("ordem", { referencedTable: "fotos_sala" });
  if (!incluirInativas) consulta = consulta.eq("ativa", true);
  const { data } = await consulta;
  return data ?? [];
});

export async function listarEventos(de: string, ate: string): Promise<EventoPublico[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("agenda_publica")
    .select("*")
    .lt("inicio", ate)
    .gt("fim", de)
    .order("inicio");
  return data ?? [];
}

export const contarPendentes = cache(async () => {
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("situacao", "pendente");
  return count ?? 0;
});

export type DataBloqueada = { id: string; data: string; descricao: string };

export async function listarBloqueadas(de: string, ate: string): Promise<DataBloqueada[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("datas_bloqueadas")
    .select("id, data, descricao")
    .gte("data", de)
    .lt("data", ate)
    .order("data");
  return data ?? [];
}

export const listarMissasCadastro = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("missas_padrao").select("*").order("hora");
  return (data ?? []) as MissaPadrao[];
});

// Missas de cada dia do período (datas "AAAA-MM-DD", fim exclusivo).
export async function listarMissas(de: string, ate: string, incluirCanceladas = false): Promise<Missa[]> {
  const supabase = await criarClienteServidor();
  const [padroes, { data: avulsas }] = await Promise.all([
    listarMissasCadastro(),
    supabase.from("missas_avulsas").select("*").gte("data", de).lt("data", ate),
  ]);
  return missasNoPeriodo(padroes, (avulsas ?? []) as MissaAvulsa[], de, ate, incluirCanceladas);
}
