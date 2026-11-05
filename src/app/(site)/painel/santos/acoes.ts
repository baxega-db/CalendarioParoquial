"use server";

import { revalidatePath } from "next/cache";
import { exigirEquipe } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function salvarSanto(mes: number, dia: number, nome: string): Promise<{ erro?: string; ok?: string }> {
  await exigirEquipe();
  if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(dia) || dia < 1 || dia > 31) return { erro: "Data inválida." };
  const texto = nome.trim();
  if (texto.length > 300) return { erro: "Texto muito longo (até 300 letras)." };

  const supabase = await criarClienteServidor();
  // Texto vazio apaga o santo daquele dia.
  const { error } = texto
    ? await supabase.from("santos_do_dia").upsert({ mes, dia, nome: texto, atualizado_em: new Date().toISOString() })
    : await supabase.from("santos_do_dia").delete().eq("mes", mes).eq("dia", dia);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath("/", "layout");
  return { ok: "Salvo." };
}
