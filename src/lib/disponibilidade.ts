import type { EventoPublico, Sala } from "./tipos";
import { seSobrepoem } from "./tempo";

export type SituacaoSala =
  | { tipo: "livre" }
  | { tipo: "pendente"; eventos: EventoPublico[] }
  | { tipo: "ocupada"; evento: EventoPublico };

// Situação de uma sala num período, olhando só os eventos já carregados.
// O banco faz a checagem final ao confirmar.
export function situacaoDaSala(
  eventos: EventoPublico[],
  salaId: string,
  inicio: string,
  fim: string,
  ignorarId?: number,
): SituacaoSala {
  const conflitos = eventos.filter(
    (e) => e.sala_id === salaId && e.id !== ignorarId && seSobrepoem(e.inicio, e.fim, inicio, fim),
  );
  const confirmado = conflitos.find((e) => e.situacao === "confirmada");
  if (confirmado) return { tipo: "ocupada", evento: confirmado };
  if (conflitos.length) return { tipo: "pendente", eventos: conflitos };
  return { tipo: "livre" };
}

export function salasLivres(eventos: EventoPublico[], salas: Sala[], inicio: string, fim: string, excetoId?: string) {
  return salas.filter((s) => s.id !== excetoId && situacaoDaSala(eventos, s.id, inicio, fim).tipo !== "ocupada");
}
