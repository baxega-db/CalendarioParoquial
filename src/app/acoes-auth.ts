"use server";

import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoForm = { erro?: string; ok?: string } | null;

export async function entrar(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const voltar = String(dados.get("voltar") ?? "");
  if (!email || !senha) return { erro: "Preencha o e-mail e a senha." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos. Confira e tente de novo." };

  redirect(voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/painel");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}

export async function pedirNovaSenha(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const email = String(dados.get("email") ?? "").trim();
  if (!email) return { erro: "Escreva o seu e-mail." };

  const supabase = await criarClienteServidor();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/confirmar?proximo=/nova-senha`,
  });
  // Mesma resposta exista ou não o e-mail, para não revelar quem tem cadastro.
  return { ok: "Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha. Veja sua caixa de entrada." };
}

export async function definirNovaSenha(_: EstadoForm, dados: FormData): Promise<EstadoForm> {
  const senha = String(dados.get("senha") ?? "");
  const repetir = String(dados.get("repetir") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 letras ou números." };
  if (senha !== repetir) return { erro: "As duas senhas não são iguais." };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: "Não foi possível trocar a senha. Peça um novo link." };
  redirect("/painel");
}
