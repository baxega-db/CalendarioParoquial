"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { horario } from "@/components/agenda/comum";
import { Aviso } from "@/components/Aviso";
import { Icone } from "@/components/Icone";
import { situacaoDaSala } from "@/lib/disponibilidade";
import type { Sala } from "@/lib/tipos";
import { horaParaMinutos, paraInstante } from "@/lib/tempo";
import { useEventosDoDia } from "@/lib/useEventosDoDia";

export type Periodo = { salaId: string; data: string; inicio: string; fim: string };

// Sala, data e horário, com a situação da sala mostrada na hora.
export function CamposPeriodo({
  salas,
  valor,
  aoMudar,
  ignorarId,
  pessoas,
  rotuloData = "Data",
  travarData,
}: {
  salas: Sala[];
  valor: Periodo;
  aoMudar: (p: Periodo) => void;
  ignorarId?: number;
  pessoas?: number;
  rotuloData?: string;
  travarData?: string; // texto explicando por que a data não pode mudar
}) {
  const { eventos, bloqueio } = useEventosDoDia(valor.data);
  const ok = valor.data && valor.inicio && valor.fim && horaParaMinutos(valor.fim) > horaParaMinutos(valor.inicio);
  const sit =
    ok && eventos && valor.salaId
      ? situacaoDaSala(eventos, valor.salaId, paraInstante(valor.data, valor.inicio), paraInstante(valor.data, valor.fim), ignorarId)
      : null;
  const sala = salas.find((s) => s.id === valor.salaId);
  const id = `p${ignorarId ?? "novo"}`;

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`${id}-sala`} className="rotulo">Sala</label>
        <select id={`${id}-sala`} className="campo" value={valor.salaId} onChange={(e) => aoMudar({ ...valor, salaId: e.target.value })}>
          <option value="">Escolha a sala</option>
          {salas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} (até {s.capacidade} pessoas){s.ativa ? "" : " — inativa"}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-data`} className="rotulo">{rotuloData}</label>
        <input
          id={`${id}-data`}
          type="date"
          className="campo"
          value={valor.data}
          disabled={!!travarData}
          onChange={(e) => aoMudar({ ...valor, data: e.target.value })}
        />
        {travarData && <p className="mt-1">{travarData}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-inicio`} className="rotulo">Início</label>
          <input id={`${id}-inicio`} type="time" step={900} className="campo" value={valor.inicio} onChange={(e) => aoMudar({ ...valor, inicio: e.target.value })} />
        </div>
        <div>
          <label htmlFor={`${id}-fim`} className="rotulo">Término</label>
          <input id={`${id}-fim`} type="time" step={900} className="campo" value={valor.fim} onChange={(e) => aoMudar({ ...valor, fim: e.target.value })} />
        </div>
      </div>
      <div aria-live="polite" className="space-y-2">
        {bloqueio && <Aviso tipo="aviso">Data bloqueada: {bloqueio}</Aviso>}
        {valor.inicio && valor.fim && !ok && <Aviso tipo="erro">O término precisa ser depois do início.</Aviso>}
        {sit?.tipo === "livre" && <Aviso tipo="sucesso">Sala livre neste horário.</Aviso>}
        {sit?.tipo === "pendente" && (
          <Aviso tipo="aviso">
            Há {sit.eventos.length === 1 ? "outro pedido aguardando" : `${sit.eventos.length} outros pedidos aguardando`} neste horário
            ({sit.eventos.map((e) => `${e.pastoral}, ${horario(e)}`).join("; ")}).
          </Aviso>
        )}
        {sit?.tipo === "ocupada" && (
          <Aviso tipo="erro">
            Sala ocupada: {sit.evento.pastoral}, das {horario(sit.evento)}.
          </Aviso>
        )}
        {sala && pessoas && pessoas > sala.capacidade ? (
          <Aviso tipo="aviso">Esta sala comporta até {sala.capacidade} pessoas.</Aviso>
        ) : null}
      </div>
    </div>
  );
}

export function CampoChave({ valor, aoMudar, nome }: { valor: boolean; aoMudar: (v: boolean) => void; nome: string }) {
  return (
    <fieldset>
      <legend className="rotulo flex items-center gap-2">
        <Icone nome="chave" /> Buscar a chave na secretaria?
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => (
          <label key={String(v)} className={`botao ${valor === v ? "botao-primario" : "botao-secundario"}`}>
            <input type="radio" name={nome} className="sr-only" checked={valor === v} onChange={() => aoMudar(v)} />
            {v ? "Sim" : "Não"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Depois de confirmar ou não aprovar: botão para abrir o WhatsApp de quem pediu.
export function JanelaRetorno({
  titulo,
  resumo,
  mensagem,
  link,
  proximo,
  aoFechar,
}: {
  titulo: string;
  resumo?: string;
  mensagem: string;
  link: string | null;
  proximo?: { href: string; texto: string };
  aoFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={aoFechar} className="m-auto w-[min(36rem,calc(100%-1.5rem))] rounded-2xl p-0 backdrop:bg-black/60">
      <div className="space-y-4 p-5">
        <h2 className="text-2xl font-extrabold">{titulo}</h2>
        {resumo && <Aviso tipo="sucesso">{resumo}</Aviso>}
        {mensagem && (
          <>
            <p className="font-bold">Mensagem pronta:</p>
            <pre className="whitespace-pre-wrap rounded-xl bg-black/5 p-3 font-sans">{mensagem}</pre>
          </>
        )}
        {link ? (
          <a href={link} target="_blank" rel="noopener" className="botao botao-whatsapp w-full text-xl" onClick={() => setTimeout(aoFechar, 300)}>
            <Icone nome="whatsapp" tamanho={28} /> Abrir o WhatsApp de quem pediu
          </a>
        ) : (
          mensagem && <Aviso tipo="aviso">Este pedido não tem telefone. Avise a pessoa de outra forma.</Aviso>
        )}
        {proximo && (
          <Link href={proximo.href} className="botao botao-primario w-full">
            {proximo.texto}
          </Link>
        )}
        <button type="button" className="botao botao-secundario w-full" onClick={aoFechar}>
          Fechar
        </button>
      </div>
    </dialog>
  );
}
