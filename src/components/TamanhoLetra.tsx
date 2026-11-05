"use client";

import { useEffect } from "react";
import { usePreferenciaLocal } from "@/lib/usePreferenciaLocal";

const ESCALAS = [1, 1.15, 1.3, 1.5];
const CHAVE = "agenda-escala-letra";

// Script curto aplicado antes da página aparecer, para não "piscar" a letra.
export const scriptEscala = `try{var e=localStorage.getItem("${CHAVE}");if(e)document.documentElement.style.setProperty("--escala",e)}catch(_){}`;

export function TamanhoLetra() {
  const [salvo, gravar] = usePreferenciaLocal(CHAVE);
  const indice = Math.max(0, ESCALAS.indexOf(Number(salvo)));

  useEffect(() => {
    document.documentElement.style.setProperty("--escala", String(ESCALAS[indice]));
  }, [indice]);

  const mudar = (novo: number) => gravar(String(ESCALAS[Math.max(0, Math.min(ESCALAS.length - 1, novo))]));

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Tamanho da letra">
      <button
        type="button"
        className="botao botao-secundario px-3"
        onClick={() => mudar(indice - 1)}
        disabled={indice === 0}
        aria-label="Diminuir a letra"
      >
        A−
      </button>
      <button
        type="button"
        className="botao botao-secundario px-3 text-xl"
        onClick={() => mudar(indice + 1)}
        disabled={indice === ESCALAS.length - 1}
        aria-label="Aumentar a letra"
      >
        A+
      </button>
    </div>
  );
}
