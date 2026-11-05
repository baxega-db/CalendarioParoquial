"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENTO = "preferencia-local";

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function assinar(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(EVENTO, aviso);
  };
}

// Preferência guardada só neste aparelho (tamanho da letra, salas escondidas).
// No servidor e em navegadores que bloqueiam o armazenamento, vale null.
export function usePreferenciaLocal(chave: string) {
  const valor = useSyncExternalStore(
    assinar,
    () => ler(chave),
    () => null,
  );
  const gravar = useCallback(
    (novo: string) => {
      try {
        localStorage.setItem(chave, novo);
      } catch {}
      window.dispatchEvent(new Event(EVENTO));
    },
    [chave],
  );
  return [valor, gravar] as const;
}
