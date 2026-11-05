"use client";

import { useActionState, useState, useTransition } from "react";
import { Aviso } from "@/components/Aviso";
import type { Perfil } from "@/lib/tipos";
import { cadastrarUsuario, mudarPerfil, removerUsuario } from "../acoes";

export function FormNovoUsuario() {
  const [estado, acao, salvando] = useActionState(cadastrarUsuario, null);
  return (
    <form action={acao} className="cartao space-y-4">
      <h2 className="text-xl font-extrabold">Cadastrar usuário</h2>
      <div>
        <label htmlFor="nome" className="rotulo">Nome</label>
        <input id="nome" name="nome" className="campo" required />
      </div>
      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input id="email" name="email" type="email" className="campo" required />
      </div>
      <div>
        <label htmlFor="senha" className="rotulo">Senha provisória (pelo menos 8 caracteres)</label>
        <input id="senha" name="senha" type="text" autoComplete="off" className="campo" required minLength={8} />
      </div>
      <div>
        <label htmlFor="perfil" className="rotulo">Perfil</label>
        <select id="perfil" name="perfil" className="campo" defaultValue="editor">
          <option value="editor">Secretaria</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}

export function AcoesUsuario({ id, nome, perfil }: { id: string; nome: string; perfil: Perfil }) {
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const rodar = (f: () => Promise<{ erro?: string } | null>) =>
    iniciar(async () => {
      const r = await f();
      setErro(r?.erro ?? "");
    });

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="botao botao-secundario"
        disabled={salvando}
        onClick={() => rodar(() => mudarPerfil(id, perfil === "admin" ? "editor" : "admin"))}
      >
        {perfil === "admin" ? "Tornar secretaria" : "Tornar administrador"}
      </button>
      <button
        type="button"
        className="botao botao-perigo"
        disabled={salvando}
        onClick={() => confirm(`Remover o acesso de ${nome}?`) && rodar(() => removerUsuario(id))}
      >
        Remover acesso
      </button>
      {erro && <p className="erro-campo w-full">{erro}</p>}
    </div>
  );
}
