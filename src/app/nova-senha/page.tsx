"use client";

import { useActionState } from "react";
import { definirNovaSenha } from "@/app/acoes-auth";
import { Aviso } from "@/components/Aviso";

export default function PaginaNovaSenha() {
  const [estado, acao, enviando] = useActionState(definirNovaSenha, null);
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="titulo-pagina">Criar nova senha</h1>
      <form action={acao} className="cartao space-y-4">
        <div>
          <label htmlFor="senha" className="rotulo">Nova senha (pelo menos 8 letras ou números)</label>
          <input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={8} className="campo" />
        </div>
        <div>
          <label htmlFor="repetir" className="rotulo">Repita a nova senha</label>
          <input id="repetir" name="repetir" type="password" autoComplete="new-password" required minLength={8} className="campo" />
        </div>
        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        <button type="submit" className="botao botao-primario w-full" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar a nova senha"}
        </button>
      </form>
    </div>
  );
}
