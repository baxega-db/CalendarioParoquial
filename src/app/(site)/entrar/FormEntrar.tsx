"use client";

import { useActionState } from "react";
import { entrar } from "@/app/acoes-auth";
import { Aviso } from "@/components/Aviso";

export function FormEntrar({ voltar }: { voltar: string }) {
  const [estado, acao, enviando] = useActionState(entrar, null);
  return (
    <form action={acao} className="cartao space-y-4">
      <input type="hidden" name="voltar" value={voltar} />
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={enviando}>
        {enviando ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
