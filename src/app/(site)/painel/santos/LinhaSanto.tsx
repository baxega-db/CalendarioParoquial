"use client";

import { useState, useTransition } from "react";
import { salvarSanto } from "./acoes";

export function LinhaSanto({ mes, dia, rotulo, inicial }: { mes: number; dia: number; rotulo: string; inicial: string }) {
  const [nome, setNome] = useState(inicial);
  const [salvo, setSalvo] = useState(inicial);
  const [retorno, setRetorno] = useState<{ erro?: string; ok?: string } | null>(null);
  const [salvando, iniciar] = useTransition();
  const mudou = nome.trim() !== salvo.trim();
  const id = `santo-${mes}-${dia}`;

  return (
    <li className="space-y-1 border-t border-borda/30 pt-2">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          id={id}
          rows={2}
          className="campo flex-1"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setRetorno(null);
          }}
          placeholder="Sem santo cadastrado"
        />
        <button
          type="button"
          className="botao botao-primario sm:self-start"
          disabled={!mudou || salvando}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarSanto(mes, dia, nome);
              setRetorno(r);
              if (r.ok) setSalvo(nome);
            })
          }
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {retorno?.erro && <p className="erro-campo">{retorno.erro}</p>}
      {retorno?.ok && !mudou && <p className="font-semibold text-sucesso">{retorno.ok}</p>}
    </li>
  );
}
