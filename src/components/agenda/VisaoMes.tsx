import Link from "next/link";
import { DIAS_CURTOS, formatarDataLonga, formatarHora, partesLocais, somarDias } from "@/lib/tempo";
import { estiloEvento, type EventoComSala } from "./comum";

const MAX_NO_DIA = 3;

export function VisaoMes({
  inicioGrade,
  mes,
  hoje,
  eventosPorDia,
  aoAbrir,
}: {
  inicioGrade: string;
  mes: string; // "AAAA-MM"
  hoje: string;
  eventosPorDia: Map<string, EventoComSala[]>;
  aoAbrir: (e: EventoComSala) => void;
}) {
  const dias = Array.from({ length: 42 }, (_, i) => somarDias(inicioGrade, i));
  // Esconde a última semana se ela for toda do mês seguinte.
  const visiveis = dias.slice(35).every((d) => d.slice(0, 7) !== mes) ? dias.slice(0, 35) : dias;

  return (
    <div className="overflow-hidden rounded-xl border border-borda/50 bg-superficie">
      <div className="grid grid-cols-7 border-b border-borda/50">
        {DIAS_CURTOS.map((d) => (
          <div key={d} className="p-1 text-center font-bold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {visiveis.map((dia) => {
          const doMes = dia.slice(0, 7) === mes;
          const eventos = eventosPorDia.get(dia) ?? [];
          const ehHoje = dia === hoje;
          return (
            <div
              key={dia}
              className={`min-h-24 border-b border-l border-borda/30 p-1 md:min-h-36 ${doMes ? "" : "bg-black/[0.04]"}`}
            >
              <Link
                href={`/?v=hoje&d=${dia}`}
                className={`mb-1 flex min-h-11 flex-col items-center justify-center rounded-lg font-bold hover:bg-black/5 md:items-start md:px-1 ${
                  ehHoje ? "bg-primaria text-white hover:bg-primaria-escura" : ""
                } ${doMes ? "" : "text-suave"}`}
                aria-label={`${formatarDataLonga(dia)}: ${eventos.length} ${eventos.length === 1 ? "atividade" : "atividades"}. Ver o dia.`}
              >
                <span>{Number(dia.slice(8))}</span>
                {/* No celular a célula é estreita: mostramos só a quantidade. */}
                {eventos.length > 0 && <span className="font-semibold md:hidden">{eventos.length}</span>}
              </Link>
              <ul className="hidden space-y-1 md:block">
                {eventos.slice(0, MAX_NO_DIA).map((ev) => {
                  const pendente = ev.situacao === "pendente";
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => aoAbrir(ev)}
                        className={`block w-full truncate rounded-md border-2 border-l-[6px] border-transparent px-1 text-left leading-snug ${
                          pendente ? "evento-pendente" : ""
                        }`}
                        style={estiloEvento(ev.sala.cor, pendente)}
                        title={`${ev.sala.nome} — ${ev.pastoral}${pendente ? " (aguardando confirmação)" : ""}`}
                      >
                        <span className="font-bold">{formatarHora(partesLocais(ev.inicio).hora)}</span> {ev.sala.nome}
                      </button>
                    </li>
                  );
                })}
                {eventos.length > MAX_NO_DIA && (
                  <li>
                    <Link href={`/?v=hoje&d=${dia}`} className="font-bold text-primaria underline">
                      + {eventos.length - MAX_NO_DIA} mais
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
