"use client";

import { Icone } from "@/components/Icone";

export function BotaoImprimir() {
  return (
    <button type="button" className="botao botao-primario" onClick={() => window.print()}>
      <Icone nome="impressora" /> Imprimir
    </button>
  );
}
