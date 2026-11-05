"use client";

import { useEffect, useState } from "react";
import { criarClienteNavegador } from "./supabase/cliente";
import { ehDataValida, intervaloDias } from "./tempo";
import type { EventoPublico } from "./tipos";

// Carrega da agenda pública os eventos do dia escolhido (para checar a sala na hora).
export function useEventosDoDia(data: string) {
  const [estado, setEstado] = useState<{ data: string; eventos: EventoPublico[] } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!ehDataValida(data)) return;
    let cancelado = false;
    const { de, ate } = intervaloDias(data, 1);
    criarClienteNavegador()
      .from("agenda_publica")
      .select("*")
      .lt("inicio", ate)
      .gt("fim", de)
      .then(({ data: linhas }) => {
        if (!cancelado) setEstado({ data, eventos: linhas ?? [] });
      });
    return () => {
      cancelado = true;
    };
  }, [data, versao]);

  const pronto = estado?.data === data;
  return {
    eventos: pronto ? estado.eventos : null,
    recarregar: () => setVersao((v) => v + 1),
  };
}
