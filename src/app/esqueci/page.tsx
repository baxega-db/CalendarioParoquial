"use client";

import { useActionState } from "react";
import { pedirNovaSenha } from "@/app/acoes-auth";
import { Aviso } from "@/components/Aviso";

export default function PaginaEsqueci() {
  const [estado, acao, enviando] = useActionState(pedirNovaSenha, null);
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="titulo-pagina">Esqueci minha senha</h1>
      <p>Escreva o seu e-mail. Vamos enviar um link para você criar uma nova senha.</p>
      <form action={acao} className="cartao space-y-4">
        <div>
          <label htmlFor="email" className="rotulo">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="campo" />
        </div>
        {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
        {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
        <button type="submit" className="botao botao-primario w-full" disabled={enviando}>
          {enviando ? "Enviando..." : "Enviar o link"}
        </button>
      </form>
    </div>
  );
}
