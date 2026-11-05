"use client";

import { useState, useTransition } from "react";
import { cancelarReserva } from "../acoes";

export function BotaoCancelar({ id }: { id: number }) {
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  return (
    <>
      <button
        type="button"
        className="botao botao-perigo"
        disabled={salvando}
        onClick={() => {
          if (!confirm("Cancelar esta reserva? Ela sai da agenda.")) return;
          iniciar(async () => {
            const r = await cancelarReserva(id);
            if ("erro" in r) setErro(r.erro);
          });
        }}
      >
        {salvando ? "Cancelando..." : "Cancelar reserva"}
      </button>
      {erro && <p className="erro-campo w-full">{erro}</p>}
    </>
  );
}
