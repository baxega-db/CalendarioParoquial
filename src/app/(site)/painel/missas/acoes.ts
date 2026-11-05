"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/dados";
import type { RegraMissa } from "@/lib/missas";
import { criarClienteServidor } from "@/lib/supabase/server";

export type Retorno = { erro?: string; ok?: string };

const HORA = /^\d{2}:\d{2}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function regraValida(r: RegraMissa) {
  switch (r.tipo) {
    case "dias_semana":
      return r.dias.length > 0 && r.dias.every((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    case "mensal_posicao":
      return [1, 2, 3, 4, -1].includes(r.posicao) && r.diaSemana >= 0 && r.diaSemana <= 6;
    case "mensal_dia":
      return Number.isInteger(r.dia) && r.dia >= 1 && r.dia <= 31;
    default:
      return false;
  }
}

function atualizar() {
  revalidatePath("/", "layout");
}

export async function salvarMissaPadrao(dados: {
  id?: string;
  regra: RegraMissa;
  hora: string;
  local: string;
  descricao: string;
  ativa: boolean;
}): Promise<Retorno> {
  await exigirEquipe();
  if (!regraValida(dados.regra)) return { erro: "Escolha quando a missa acontece (pelo menos um dia)." };
  if (!HORA.test(dados.hora)) return { erro: "Escolha o horário." };
  if (!dados.local.trim()) return { erro: "Escreva o local (ex.: Igreja Matriz)." };

  const linha = {
    regra: dados.regra,
    hora: dados.hora,
    local: dados.local.trim(),
    descricao: dados.descricao.trim(),
    ativa: dados.ativa,
  };
  const supabase = await criarClienteServidor();
  const { error } = dados.id
    ? await supabase.from("missas_padrao").update(linha).eq("id", dados.id)
    : await supabase.from("missas_padrao").insert(linha);
  if (error) return { erro: "Não foi possível salvar." };
  atualizar();
  return { ok: "Horário salvo." };
}

export async function removerMissaPadrao(id: string): Promise<Retorno> {
  await exigirEquipe();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("missas_padrao").delete().eq("id", id);
  if (error) return { erro: "Não foi possível remover." };
  atualizar();
  return { ok: "Horário removido." };
}

export async function adicionarMissa(dados: { data: string; hora: string; local: string; descricao: string }): Promise<Retorno> {
  await exigirEquipe();
  if (!DATA.test(dados.data)) return { erro: "Escolha a data." };
  if (!HORA.test(dados.hora)) return { erro: "Escolha o horário." };
  if (!dados.local.trim()) return { erro: "Escreva o local." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("missas_avulsas").insert({
    tipo: "adicional",
    data: dados.data,
    hora: dados.hora,
    local: dados.local.trim(),
    descricao: dados.descricao.trim(),
  });
  if (error) return { erro: "Não foi possível salvar." };
  atualizar();
  return { ok: "Missa adicional salva." };
}

export async function removerMissaAvulsa(id: string): Promise<Retorno> {
  await exigirEquipe();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("missas_avulsas").delete().eq("id", id).eq("tipo", "adicional");
  if (error) return { erro: "Não foi possível remover." };
  atualizar();
  return { ok: "Missa removida." };
}

// Tira (ou devolve) uma missa do horário padrão numa data específica.
export async function cancelarMissaNaData(padraoId: string, data: string, cancelar: boolean): Promise<Retorno> {
  await exigirEquipe();
  if (!DATA.test(data)) return { erro: "Data inválida." };
  const supabase = await criarClienteServidor();
  const { error } = cancelar
    ? await supabase.from("missas_avulsas").insert({ tipo: "cancelada", data, missa_padrao_id: padraoId })
    : await supabase.from("missas_avulsas").delete().eq("tipo", "cancelada").eq("data", data).eq("missa_padrao_id", padraoId);
  if (error && error.code !== "23505") return { erro: "Não foi possível salvar." };
  atualizar();
  return { ok: cancelar ? "Missa cancelada nesta data." : "Missa de volta na agenda." };
}
