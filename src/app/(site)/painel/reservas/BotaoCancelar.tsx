"use client";

import { useState, useTransition } from "react";
import { cancelarReserva, type Escopo } from "../acoes";

const PERGUNTAS: Record<Escopo, string> = {
  este: "Cancelar só este encontro? Ele sai da agenda.",
  proximos: "Cancelar este encontro e todos os próximos da série?",
  todos: "Cancelar TODOS os encontros da série, inclusive os que já passaram?",
};

export function BotaoCancelar({ id, emSerie }: { id: number; emSerie?: boolean }) {
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [escolhendo, setEscolhendo] = useState(false);

  function cancelar(escopo: Escopo) {
    if (!confirm(PERGUNTAS[escopo])) return;
    iniciar(async () => {
      const r = await cancelarReserva(id, escopo);
      if ("erro" in r) setErro(r.erro);
      setEscolhendo(false);
    });
  }

  if (emSerie && escolhendo)
    return (
      <div className="w-full space-y-2 rounded-xl border-2 border-perigo p-2">
        <p className="font-bold">Cancelar o quê?</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao botao-perigo" disabled={salvando} onClick={() => cancelar("este")}>
            Só este
          </button>
          <button type="button" className="botao botao-perigo" disabled={salvando} onClick={() => cancelar("proximos")}>
            Este e os próximos
          </button>
          <button type="button" className="botao botao-perigo" disabled={salvando} onClick={() => cancelar("todos")}>
            Todos da série
          </button>
          <button type="button" className="botao botao-secundario" disabled={salvando} onClick={() => setEscolhendo(false)}>
            Voltar
          </button>
        </div>
        {erro && <p className="erro-campo">{erro}</p>}
      </div>
    );

  return (
    <>
      <button
        type="button"
        className="botao botao-perigo"
        disabled={salvando}
        onClick={() => (emSerie ? setEscolhendo(true) : cancelar("este"))}
      >
        {salvando ? "Cancelando..." : "Cancelar reserva"}
      </button>
      {erro && <p className="erro-campo w-full">{erro}</p>}
    </>
  );
}
