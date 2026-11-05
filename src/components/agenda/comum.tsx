import type { EventoPublico, Sala } from "@/lib/tipos";
import { formatarHora, partesLocais } from "@/lib/tempo";

export type EventoComSala = EventoPublico & { sala: Sala };

export function NomeSala({ sala, negrito = true }: { sala: Pick<Sala, "nome" | "cor">; negrito?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${negrito ? "font-bold" : ""}`}>
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/30"
        style={{ background: sala.cor }}
      />
      {sala.nome}
    </span>
  );
}

export function estiloEvento(cor: string, pendente: boolean): React.CSSProperties {
  return {
    borderLeftColor: cor,
    borderColor: pendente ? cor : undefined,
    backgroundColor: pendente ? `${cor}10` : `${cor}22`,
  };
}

export function SeloPendente() {
  return (
    <span className="inline-block rounded-md border-2 border-dashed border-aviso bg-aviso-fundo px-2 font-bold text-aviso">
      Aguardando confirmação
    </span>
  );
}

export function horario(evento: Pick<EventoPublico, "inicio" | "fim">) {
  return `${formatarHora(partesLocais(evento.inicio).hora)} às ${formatarHora(partesLocais(evento.fim).hora)}`;
}
