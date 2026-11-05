"use client";

import { useEffect, useState } from "react";
import { criarClienteNavegador } from "./supabase/cliente";
import { ehDataValida, intervaloDias } from "./tempo";
import type { EventoPublico } from "./tipos";

// Carrega da agenda pública os eventos do dia escolhido (para checar a sala na hora).
export function useEventosDoDia(data: string) {
  const [estado, setEstado] = useState<{ data: string; eventos: EventoPublico[]; bloqueio: string | null } | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!ehDataValida(data)) return;
    let cancelado = false;
    const { de, ate } = intervaloDias(data, 1);
    const supabase = criarClienteNavegador();
    Promise.all([
      supabase.from("agenda_publica").select("*").lt("inicio", ate).gt("fim", de),
      supabase.from("datas_bloqueadas").select("descricao").eq("data", data).maybeSingle(),
    ]).then(([{ data: linhas }, { data: bloqueio }]) => {
      if (!cancelado) setEstado({ data, eventos: linhas ?? [], bloqueio: bloqueio?.descricao ?? null });
    });
    return () => {
      cancelado = true;
    };
  }, [data, versao]);

  const pronto = estado?.data === data;
  return {
    eventos: pronto ? estado.eventos : null,
    bloqueio: pronto ? estado.bloqueio : null, // motivo, se a data estiver bloqueada
    recarregar: () => setVersao((v) => v + 1),
  };
}
