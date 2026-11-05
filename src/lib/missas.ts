import { combina, type Regra } from "./recorrencia";
import { formatarHora, somarDias } from "./tempo";

export type RegraMissa = Extract<Regra, { tipo: "dias_semana" | "mensal_posicao" | "mensal_dia" }>;

export type MissaPadrao = {
  id: string;
  regra: RegraMissa;
  hora: string; // "07:00"
  local: string;
  descricao: string;
  ativa: boolean;
};

export type MissaAvulsa = {
  id: string;
  tipo: "adicional" | "cancelada";
  data: string;
  hora: string | null;
  local: string | null;
  descricao: string;
  missa_padrao_id: string | null;
};

// Uma missa num dia: vinda do horário padrão ou adicional.
export type Missa = {
  chave: string;
  data: string;
  hora: string;
  local: string;
  descricao: string;
  padraoId: string | null; // missa padrão de origem (para cancelar nesta data)
  avulsaId: string | null; // registro da missa adicional (para remover)
  cancelada: boolean;
};

export const DURACAO_MISSA_MIN = 60;

// Missas de cada dia do período [de, ate). Por padrão as canceladas ficam de
// fora; com `incluirCanceladas` elas vêm marcadas (para a tela da secretaria).
export function missasNoPeriodo(
  padroes: MissaPadrao[],
  avulsas: MissaAvulsa[],
  de: string,
  ate: string,
  incluirCanceladas = false,
): Missa[] {
  const canceladas = new Set(avulsas.filter((a) => a.tipo === "cancelada").map((a) => `${a.missa_padrao_id}|${a.data}`));
  const lista: Missa[] = [];
  for (let data = de; data < ate; data = somarDias(data, 1)) {
    for (const p of padroes) {
      if (!p.ativa || !combina(p.regra, data, data)) continue;
      const cancelada = canceladas.has(`${p.id}|${data}`);
      if (cancelada && !incluirCanceladas) continue;
      lista.push({
        chave: `${p.id}|${data}`,
        data,
        hora: p.hora.slice(0, 5),
        local: p.local,
        descricao: p.descricao,
        padraoId: p.id,
        avulsaId: null,
        cancelada,
      });
    }
  }
  for (const a of avulsas) {
    if (a.tipo !== "adicional" || a.data < de || a.data >= ate) continue;
    lista.push({
      chave: a.id,
      data: a.data,
      hora: (a.hora ?? "00:00").slice(0, 5),
      local: a.local ?? "",
      descricao: a.descricao,
      padraoId: null,
      avulsaId: a.id,
      cancelada: false,
    });
  }
  return lista.sort((x, y) => (x.data + x.hora + x.local).localeCompare(y.data + y.hora + y.local));
}

export function agruparPorDia(missas: Missa[]) {
  const mapa = new Map<string, Missa[]>();
  for (const m of missas) mapa.set(m.data, [...(mapa.get(m.data) ?? []), m]);
  return mapa;
}

// "07h00 (Matriz)" — o local só aparece quando há mais de um no dia.
export function resumoDoDia(missas: Missa[]) {
  const variosLocais = new Set(missas.map((m) => m.local)).size > 1;
  return missas.map((m) => `${formatarHora(m.hora)}${variosLocais ? ` (${m.local})` : ""}`).join(", ");
}
