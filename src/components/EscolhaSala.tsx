"use client";

import { NomeSala, horario } from "@/components/agenda/comum";
import { FotoSala } from "@/components/salas/CartaoSala";
import { Icone } from "@/components/Icone";
import type { SituacaoSala } from "@/lib/disponibilidade";
import type { Sala } from "@/lib/tipos";

const SELO = {
  livre: { texto: "Livre neste horário", classe: "bg-sucesso-fundo text-sucesso border-sucesso" },
  pendente: { texto: "Já tem pedido aguardando", classe: "bg-aviso-fundo text-aviso border-aviso" },
  ocupada: { texto: "Ocupada", classe: "bg-perigo-fundo text-perigo border-perigo" },
};

// Cartões grandes com foto, nome, capacidade e situação no horário escolhido.
export function EscolhaSala({
  salas,
  valor,
  aoEscolher,
  situacoes,
  invalido,
}: {
  salas: Sala[];
  valor: string;
  aoEscolher: (id: string) => void;
  situacoes: Map<string, SituacaoSala> | null;
  invalido?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Sala" aria-invalid={invalido}>
      {salas.map((sala) => {
        const sit = situacoes?.get(sala.id);
        const ocupada = sit?.tipo === "ocupada";
        const escolhida = valor === sala.id;
        return (
          <button
            key={sala.id}
            type="button"
            role="radio"
            aria-checked={escolhida}
            disabled={ocupada}
            onClick={() => aoEscolher(sala.id)}
            className={`relative space-y-1 rounded-2xl border-4 bg-superficie p-3 text-left ${
              escolhida ? "border-primaria shadow-lg" : "border-transparent ring-1 ring-borda/50"
            } ${ocupada ? "cursor-not-allowed opacity-70" : "hover:shadow-md"}`}
          >
            {escolhida && (
              <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg bg-primaria px-2 py-1 font-bold text-white">
                <Icone nome="check" /> Escolhida
              </span>
            )}
            <FotoSala sala={sala} />
            <span className="block text-xl">
              <NomeSala sala={sala} />
            </span>
            <span className="block">Até {sala.capacidade} pessoas</span>
            {sit && (
              <span className={`inline-block rounded-lg border-2 px-2 font-bold ${SELO[sit.tipo].classe}`}>
                {SELO[sit.tipo].texto}
                {sit.tipo === "ocupada" && ` (${horario(sit.evento)})`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
