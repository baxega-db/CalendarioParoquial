"use client";

import { useState, useTransition } from "react";
import { Aviso } from "@/components/Aviso";
import type { MissaPadrao, RegraMissa } from "@/lib/missas";
import { descreverRegra, NOMES_DIAS } from "@/lib/recorrencia";
import { DIAS_CURTOS, hojeISO } from "@/lib/tempo";
import { adicionarMissa, cancelarMissaNaData, removerMissaAvulsa, removerMissaPadrao, salvarMissaPadrao, type Retorno } from "./acoes";

function useAcao() {
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  const [salvando, iniciar] = useTransition();
  const rodar = (f: () => Promise<Retorno>, depois?: () => void) =>
    iniciar(async () => {
      const r = await f();
      setRetorno(r);
      if (r.ok) depois?.();
    });
  return { retorno, salvando, rodar };
}

function Mensagem({ retorno }: { retorno: Retorno | null }) {
  if (retorno?.erro) return <Aviso tipo="erro">{retorno.erro}</Aviso>;
  if (retorno?.ok) return <Aviso tipo="sucesso">{retorno.ok}</Aviso>;
  return null;
}

function CampoLocal({ id, valor, aoMudar, locais }: { id: string; valor: string; aoMudar: (v: string) => void; locais: string[] }) {
  return (
    <div>
      <label htmlFor={id} className="rotulo">Local</label>
      <input id={id} className="campo" list={`${id}-lista`} value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder="Exemplo: Igreja Matriz" />
      <datalist id={`${id}-lista`}>
        {locais.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </div>
  );
}

const TIPOS: { tipo: RegraMissa["tipo"]; texto: string }[] = [
  { tipo: "dias_semana", texto: "Toda semana, nos dias escolhidos" },
  { tipo: "mensal_posicao", texto: "Todo mês, numa posição (ex.: 1ª sexta)" },
  { tipo: "mensal_dia", texto: "Todo mês, num dia (ex.: dia 13)" },
];

function padraoDoTipo(tipo: RegraMissa["tipo"]): RegraMissa {
  if (tipo === "dias_semana") return { tipo, dias: [0] };
  if (tipo === "mensal_posicao") return { tipo, posicao: 1, diaSemana: 5 };
  return { tipo, dia: 13 };
}

export function FormMissaPadrao({ missa, locais, aoTerminar }: { missa?: MissaPadrao; locais: string[]; aoTerminar?: () => void }) {
  const [regra, setRegra] = useState<RegraMissa>(missa?.regra ?? { tipo: "dias_semana", dias: [0] });
  const [hora, setHora] = useState(missa?.hora.slice(0, 5) ?? "");
  const [local, setLocal] = useState(missa?.local ?? locais[0] ?? "");
  const [descricao, setDescricao] = useState(missa?.descricao ?? "");
  const [ativa, setAtiva] = useState(missa?.ativa ?? true);
  const { retorno, salvando, rodar } = useAcao();
  const id = missa?.id ?? "nova";

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    rodar(
      () => salvarMissaPadrao({ id: missa?.id, regra, hora, local, descricao, ativa }),
      () => {
        if (!missa) {
          setHora("");
          setDescricao("");
        }
        aoTerminar?.();
      },
    );
  }

  return (
    <form onSubmit={salvar} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="rotulo">Quando?</legend>
        {TIPOS.map((t) => (
          <label key={t.tipo} className={`botao w-full justify-start ${regra.tipo === t.tipo ? "botao-primario" : "botao-secundario"}`}>
            <input type="radio" name={`tipo-${id}`} className="sr-only" checked={regra.tipo === t.tipo} onChange={() => setRegra(padraoDoTipo(t.tipo))} />
            <span aria-hidden="true">{regra.tipo === t.tipo ? "●" : "○"}</span> {t.texto}
          </label>
        ))}
      </fieldset>

      {regra.tipo === "dias_semana" && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DIAS_CURTOS.map((nome, d) => {
            const marcado = regra.dias.includes(d);
            return (
              <label key={d} className={`botao px-1 ${marcado ? "botao-primario" : "botao-secundario"}`}>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={marcado}
                  onChange={() => setRegra({ ...regra, dias: marcado ? regra.dias.filter((x) => x !== d) : [...regra.dias, d] })}
                />
                {nome}
              </label>
            );
          })}
        </div>
      )}
      {regra.tipo === "mensal_posicao" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`pos-${id}`} className="rotulo">Qual?</label>
            <select
              id={`pos-${id}`}
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
            <label htmlFor={`dia-sem-${id}`} className="rotulo">Dia da semana</label>
            <select id={`dia-sem-${id}`} className="campo" value={regra.diaSemana} onChange={(e) => setRegra({ ...regra, diaSemana: Number(e.target.value) })}>
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
          <label htmlFor={`dia-${id}`} className="rotulo">Dia do mês</label>
          <input
            id={`dia-${id}`}
            type="number"
            min={1}
            max={31}
            className="campo"
            value={regra.dia}
            onChange={(e) => setRegra({ ...regra, dia: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </div>
      )}

      <div>
        <label htmlFor={`hora-${id}`} className="rotulo">Horário</label>
        <input id={`hora-${id}`} type="time" step={900} className="campo" required value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <CampoLocal id={`local-${id}`} valor={local} aoMudar={setLocal} locais={locais} />
      <div>
        <label htmlFor={`desc-${id}`} className="rotulo">Observação (opcional)</label>
        <input id={`desc-${id}`} className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Exemplo: Missa das crianças" />
      </div>
      {missa && (
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" className="h-6 w-6" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
          Em uso (desmarque para suspender sem apagar)
        </label>
      )}
      <p className="font-bold">
        {descreverRegra(regra, hojeISO())}
        {hora && `, às ${hora.replace(":", "h")}`}
      </p>
      <Mensagem retorno={retorno} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="botao botao-primario" disabled={salvando}>
          {salvando ? "Salvando..." : missa ? "Salvar" : "Cadastrar horário"}
        </button>
        {missa && (
          <>
            <button type="button" className="botao botao-secundario" onClick={aoTerminar}>
              Voltar
            </button>
            <button
              type="button"
              className="botao botao-perigo"
              disabled={salvando}
              onClick={() => confirm("Apagar este horário de missa?") && rodar(() => removerMissaPadrao(missa.id), aoTerminar)}
            >
              Apagar
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export function ItemMissaPadrao({ missa, locais }: { missa: MissaPadrao; locais: string[] }) {
  const [editando, setEditando] = useState(false);
  if (editando)
    return (
      <li className="cartao">
        <FormMissaPadrao missa={missa} locais={locais} aoTerminar={() => setEditando(false)} />
      </li>
    );
  return (
    <li className={`cartao flex flex-wrap items-center gap-3 ${missa.ativa ? "" : "opacity-70"}`}>
      <div className="mr-auto">
        <p className="text-lg font-extrabold">
          {missa.hora.slice(0, 5).replace(":", "h")} — {descreverRegra(missa.regra, hojeISO())}
        </p>
        <p>
          {missa.local}
          {missa.descricao && ` · ${missa.descricao}`}
          {!missa.ativa && <strong> · Suspensa</strong>}
        </p>
      </div>
      <button type="button" className="botao botao-secundario" onClick={() => setEditando(true)}>
        Editar
      </button>
    </li>
  );
}

export function FormMissaAdicional({ locais }: { locais: string[] }) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [local, setLocal] = useState(locais[0] ?? "");
  const [descricao, setDescricao] = useState("");
  const { retorno, salvando, rodar } = useAcao();
  return (
    <form
      className="cartao space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => adicionarMissa({ data, hora, local, descricao }), () => {
          setHora("");
          setDescricao("");
        });
      }}
    >
      <h2 className="text-xl font-extrabold">Missa adicional</h2>
      <p>Uma missa a mais numa data (festa, solenidade, missa especial).</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="ad-data" className="rotulo">Data</label>
          <input id="ad-data" type="date" className="campo" required min={hojeISO()} value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ad-hora" className="rotulo">Horário</label>
          <input id="ad-hora" type="time" step={900} className="campo" required value={hora} onChange={(e) => setHora(e.target.value)} />
        </div>
      </div>
      <CampoLocal id="ad-local" valor={local} aoMudar={setLocal} locais={locais} />
      <div>
        <label htmlFor="ad-desc" className="rotulo">Observação (opcional)</label>
        <input id="ad-desc" className="campo" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Exemplo: Solenidade da Imaculada Conceição" />
      </div>
      <Mensagem retorno={retorno} />
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar missa adicional"}
      </button>
    </form>
  );
}

// Ações em cada missa da lista das próximas semanas.
export function AcoesMissa({
  padraoId,
  avulsaId,
  data,
  cancelada,
}: {
  padraoId: string | null;
  avulsaId: string | null;
  data: string;
  cancelada: boolean;
}) {
  const { retorno, salvando, rodar } = useAcao();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {padraoId && !cancelada && (
        <button
          type="button"
          className="botao botao-perigo"
          disabled={salvando}
          onClick={() => confirm("Não haverá esta missa nesta data?") && rodar(() => cancelarMissaNaData(padraoId, data, true))}
        >
          Não haverá nesta data
        </button>
      )}
      {padraoId && cancelada && (
        <button type="button" className="botao botao-secundario" disabled={salvando} onClick={() => rodar(() => cancelarMissaNaData(padraoId, data, false))}>
          Desfazer cancelamento
        </button>
      )}
      {avulsaId && (
        <button
          type="button"
          className="botao botao-perigo"
          disabled={salvando}
          onClick={() => confirm("Apagar esta missa adicional?") && rodar(() => removerMissaAvulsa(avulsaId))}
        >
          Apagar
        </button>
      )}
      {retorno?.erro && <p className="erro-campo w-full">{retorno.erro}</p>}
    </div>
  );
}
