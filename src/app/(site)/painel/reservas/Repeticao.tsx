"use client";

import { horario, NomeSala } from "@/components/agenda/comum";
import { Aviso } from "@/components/Aviso";
import { situacaoDaSala } from "@/lib/disponibilidade";
import { descreverRegra, NOMES_DIAS, posicaoNoMes, type Regra, type Termino } from "@/lib/recorrencia";
import type { EventoPublico, Sala } from "@/lib/tipos";
import { DIAS_CURTOS, diaDaSemana, formatarDataLonga, paraInstante, somarMeses } from "@/lib/tempo";

export type ConfigRepeticao = { regra: Regra; termino: Termino; pularBloqueadas: boolean };

export function configInicial(data: string): ConfigRepeticao {
  return {
    regra: { tipo: "semanal", intervalo: 1 },
    termino: { tipo: "data", ate: somarMeses(data, 3) },
    pularBloqueadas: true,
  };
}

const TIPOS: { tipo: Regra["tipo"]; texto: string }[] = [
  { tipo: "semanal", texto: "Toda semana ou a cada 2 semanas" },
  { tipo: "dias_semana", texto: "Em dias da semana escolhidos" },
  { tipo: "mensal_posicao", texto: "Todo mês, numa posição (ex.: toda 3ª terça)" },
  { tipo: "mensal_dia", texto: "Todo mês, num dia (ex.: todo dia 15)" },
];

function regraPadrao(tipo: Regra["tipo"], data: string): Regra {
  switch (tipo) {
    case "semanal":
      return { tipo, intervalo: 1 };
    case "dias_semana":
      return { tipo, dias: [diaDaSemana(data)] };
    case "mensal_posicao":
      return { tipo, posicao: posicaoNoMes(data), diaSemana: diaDaSemana(data) };
    case "mensal_dia":
      return { tipo, dia: Number(data.slice(8)) };
  }
}

function Opcao({ ativo, aoEscolher, children }: { ativo: boolean; aoEscolher: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={ativo}
      className={`botao w-full justify-start text-left ${ativo ? "botao-primario" : "botao-secundario"}`}
    >
      <span aria-hidden="true">{ativo ? "●" : "○"}</span> {children}
    </button>
  );
}

export function CamposRepeticao({
  data,
  valor,
  aoMudar,
}: {
  data: string;
  valor: ConfigRepeticao;
  aoMudar: (v: ConfigRepeticao) => void;
}) {
  const { regra, termino } = valor;
  const setRegra = (r: Regra) => aoMudar({ ...valor, regra: r });

  return (
    <div className="space-y-4 rounded-xl border-2 border-primaria p-3">
      <fieldset className="space-y-2">
        <legend className="rotulo">Como se repete?</legend>
        {TIPOS.map((t) => (
          <Opcao key={t.tipo} ativo={regra.tipo === t.tipo} aoEscolher={() => setRegra(regraPadrao(t.tipo, data))}>
            {t.texto}
          </Opcao>
        ))}
      </fieldset>

      {regra.tipo === "semanal" && (
        <div className="grid grid-cols-2 gap-2">
          {([1, 2] as const).map((n) => (
            <Opcao key={n} ativo={regra.intervalo === n} aoEscolher={() => setRegra({ ...regra, intervalo: n })}>
              {n === 1 ? "Toda semana" : "A cada 2 semanas"}
            </Opcao>
          ))}
        </div>
      )}

      {regra.tipo === "dias_semana" && (
        <fieldset>
          <legend className="rotulo">Quais dias?</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DIAS_CURTOS.map((nome, d) => {
              const marcado = regra.dias.includes(d);
              return (
                <label key={d} className={`botao px-1 ${marcado ? "botao-primario" : "botao-secundario"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={marcado}
                    onChange={() =>
                      setRegra({ ...regra, dias: marcado ? regra.dias.filter((x) => x !== d) : [...regra.dias, d] })
                    }
                  />
                  {nome}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {regra.tipo === "mensal_posicao" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rep-posicao" className="rotulo">Qual?</label>
            <select
              id="rep-posicao"
              className="campo"
              value={regra.posicao}
              onChange={(e) => setRegra({ ...regra, posicao: Number(e.target.value) as 1 | 2 | 3 | 4 | -1 })}
            >
              <option value={1}>1ª / 1º</option>
              <option value={2}>2ª / 2º</option>
              <option value={3}>3ª / 3º</option>
              <option value={4}>4ª / 4º</option>
              <option value={-1}>Última / Último</option>
            </select>
          </div>
          <div>
            <label htmlFor="rep-dia-semana" className="rotulo">Dia da semana</label>
            <select
              id="rep-dia-semana"
              className="campo"
              value={regra.diaSemana}
              onChange={(e) => setRegra({ ...regra, diaSemana: Number(e.target.value) })}
            >
              {NOMES_DIAS.map((n, d) => (
                <option key={d} value={d}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {regra.tipo === "mensal_dia" && (
        <div>
          <label htmlFor="rep-dia" className="rotulo">Dia do mês</label>
          <input
            id="rep-dia"
            type="number"
            min={1}
            max={31}
            className="campo"
            value={regra.dia}
            onChange={(e) => setRegra({ ...regra, dia: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
          />
          {regra.dia > 28 && <p className="mt-1">Nos meses que não têm o dia {regra.dia}, o encontro é pulado.</p>}
        </div>
      )}

      <fieldset className="space-y-2">
        <legend className="rotulo">Até quando?</legend>
        <div className="grid grid-cols-2 gap-2">
          <Opcao ativo={termino.tipo === "data"} aoEscolher={() => aoMudar({ ...valor, termino: { tipo: "data", ate: somarMeses(data, 3) } })}>
            Até uma data
          </Opcao>
          <Opcao ativo={termino.tipo === "quantidade"} aoEscolher={() => aoMudar({ ...valor, termino: { tipo: "quantidade", total: 10 } })}>
            Número de encontros
          </Opcao>
        </div>
        {termino.tipo === "data" ? (
          <div>
            <label htmlFor="rep-ate" className="rotulo">Último dia</label>
            <input
              id="rep-ate"
              type="date"
              className="campo"
              min={data}
              value={termino.ate}
              onChange={(e) => aoMudar({ ...valor, termino: { tipo: "data", ate: e.target.value } })}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="rep-total" className="rotulo">Quantos encontros?</label>
            <input
              id="rep-total"
              type="number"
              min={1}
              max={200}
              className="campo"
              value={termino.total}
              onChange={(e) =>
                aoMudar({ ...valor, termino: { tipo: "quantidade", total: Math.min(200, Math.max(1, Number(e.target.value) || 1)) } })
              }
            />
          </div>
        )}
      </fieldset>

      <label className="flex min-h-12 items-center gap-3">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={valor.pularBloqueadas}
          onChange={(e) => aoMudar({ ...valor, pularBloqueadas: e.target.checked })}
        />
        Pular feriados e datas bloqueadas
      </label>

      <p className="font-bold first-letter:uppercase">{descreverRegra(regra, data)}</p>
    </div>
  );
}

export type LinhaPrevia = { data: string; salaId: string; incluir: boolean };

// Lista das datas geradas, com conflitos e datas bloqueadas destacados.
// Em cada data dá para pular ou trocar a sala.
export function PreviaDatas({
  linhas,
  aoMudar,
  salas,
  eventos,
  bloqueadas,
  puladas,
  horaInicio,
  horaFim,
}: {
  linhas: LinhaPrevia[];
  aoMudar: (l: LinhaPrevia[]) => void;
  salas: Sala[];
  eventos: EventoPublico[];
  bloqueadas: Map<string, string>;
  puladas: string[];
  horaInicio: string;
  horaFim: string;
}) {
  const mudar = (i: number, parcial: Partial<LinhaPrevia>) => aoMudar(linhas.map((l, j) => (j === i ? { ...l, ...parcial } : l)));
  const incluidas = linhas.filter((l) => l.incluir).length;

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-extrabold">
        Datas geradas: {linhas.length} ({incluidas} marcadas para salvar)
      </h3>
      {puladas.length > 0 && (
        <Aviso tipo="info">
          Puladas por serem datas bloqueadas:{" "}
          {puladas.map((d) => `${formatarDataLonga(d)} (${bloqueadas.get(d) ?? "bloqueada"})`).join("; ")}.
        </Aviso>
      )}
      <ul className="space-y-2">
        {linhas.map((l, i) => {
          const sit = situacaoDaSala(eventos, l.salaId, paraInstante(l.data, horaInicio), paraInstante(l.data, horaFim));
          const bloqueio = bloqueadas.get(l.data);
          const destaque =
            sit.tipo === "ocupada" ? "border-perigo bg-perigo-fundo" : bloqueio || sit.tipo === "pendente" ? "border-aviso bg-aviso-fundo" : "border-borda/40";
          const livres = salas.filter(
            (s) => s.id === l.salaId || situacaoDaSala(eventos, s.id, paraInstante(l.data, horaInicio), paraInstante(l.data, horaFim)).tipo !== "ocupada",
          );
          return (
            <li key={l.data} className={`space-y-2 rounded-xl border-2 p-3 ${destaque} ${l.incluir ? "" : "opacity-70"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex min-h-12 items-center gap-3 font-bold">
                  <input type="checkbox" className="h-6 w-6" checked={l.incluir} onChange={(e) => mudar(i, { incluir: e.target.checked })} />
                  <span className="first-letter:uppercase">{formatarDataLonga(l.data, true)}</span>
                </label>
                {!l.incluir && <span className="font-bold">(pular)</span>}
              </div>
              {bloqueio && <p className="font-bold text-aviso">Data bloqueada: {bloqueio}</p>}
              {sit.tipo === "ocupada" && (
                <p className="font-bold text-perigo">
                  Sala ocupada: {sit.evento.pastoral}, das {horario(sit.evento)}. Pule esta data ou troque a sala.
                </p>
              )}
              {sit.tipo === "pendente" && <p className="font-bold text-aviso">Há pedido aguardando nesta sala e horário.</p>}
              {sit.tipo === "livre" && !bloqueio && <p className="font-semibold text-sucesso">Sala livre</p>}
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`sala-${l.data}`} className="font-bold">
                  Sala nesta data:
                </label>
                <select
                  id={`sala-${l.data}`}
                  className="campo w-auto"
                  value={l.salaId}
                  onChange={(e) => mudar(i, { salaId: e.target.value, incluir: true })}
                >
                  {livres.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
                {(() => {
                  const sala = salas.find((s) => s.id === l.salaId);
                  return sala ? <NomeSala sala={sala} negrito={false} /> : null;
                })()}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
