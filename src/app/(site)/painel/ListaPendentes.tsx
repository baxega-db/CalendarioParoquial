"use client";

import { useState, useTransition } from "react";
import { NomeSala } from "@/components/agenda/comum";
import { Aviso } from "@/components/Aviso";
import { Icone } from "@/components/Icone";
import { situacaoDaSala } from "@/lib/disponibilidade";
import type { Reserva, Sala } from "@/lib/tipos";
import { formatarDataLonga, formatarHora, partesLocais } from "@/lib/tempo";
import { useEventosDoDia } from "@/lib/useEventosDoDia";
import { formatarTelefone, numeroPedido } from "@/lib/whatsapp";
import { confirmarPedido, recusarPedido, type Resultado } from "./acoes";
import { CampoChave, CamposPeriodo, JanelaRetorno, type Periodo } from "./componentes";

type Retorno = { titulo: string; mensagem: string; link: string | null; proximo?: { href: string; texto: string } };

export function ListaPendentes({ pedidos, salas }: { pedidos: Reserva[]; salas: Sala[] }) {
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  return (
    <>
      {pedidos.length === 0 && <Aviso tipo="sucesso">Nenhum pedido aguardando. Tudo em dia!</Aviso>}
      <ul className="space-y-5">
        {pedidos.map((p) => (
          <li key={p.id}>
            <CartaoPendente pedido={p} salas={salas} aoConcluir={setRetorno} />
          </li>
        ))}
      </ul>
      {retorno && <JanelaRetorno {...retorno} aoFechar={() => setRetorno(null)} />}
    </>
  );
}

function CartaoPendente({
  pedido,
  salas,
  aoConcluir,
}: {
  pedido: Reserva;
  salas: Sala[];
  aoConcluir: (r: Retorno) => void;
}) {
  const inicio = partesLocais(pedido.inicio);
  const original: Periodo = { salaId: pedido.sala_id, data: inicio.data, inicio: inicio.hora, fim: partesLocais(pedido.fim).hora };
  const [modo, setModo] = useState<"ver" | "editar" | "recusar">("ver");
  const [periodo, setPeriodo] = useState<Periodo>(original);
  const [chave, setChave] = useState(pedido.buscar_chave);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, iniciar] = useTransition();
  const { eventos } = useEventosDoDia(original.data);

  const sala = salas.find((s) => s.id === pedido.sala_id);
  const sit = eventos ? situacaoDaSala(eventos, pedido.sala_id, pedido.inicio, pedido.fim, pedido.id) : null;

  function tratar(r: Resultado, titulo: string, confirmado = false) {
    if ("erro" in r) setErro(r.erro);
    else
      aoConcluir({
        titulo,
        mensagem: r.mensagem,
        link: r.link,
        // Pedido com repetição: atalho para criar as próximas datas da série.
        proximo:
          confirmado && pedido.recorrencia_pedida
            ? { href: `/painel/reservas/nova?copiar=${pedido.id}`, texto: "Criar as próximas datas da repetição" }
            : undefined,
      });
  }

  function confirmar(p: Periodo) {
    setErro("");
    iniciar(async () => {
      tratar(await confirmarPedido({ id: pedido.id, buscarChave: chave, ...p }), `Pedido nº ${numeroPedido(pedido.id)} confirmado`, true);
    });
  }

  function recusar() {
    setErro("");
    iniciar(async () => {
      tratar(await recusarPedido({ id: pedido.id, motivo }), `Pedido nº ${numeroPedido(pedido.id)} não aprovado`);
    });
  }

  function mudarPeriodo(p: Periodo) {
    // Ao trocar de sala, a chave volta ao padrão da ficha da nova sala.
    if (p.salaId !== periodo.salaId) {
      const nova = salas.find((s) => s.id === p.salaId);
      if (nova) setChave(nova.precisa_chave);
    }
    setPeriodo(p);
  }

  return (
    <article className="cartao space-y-3 border-l-[10px]" style={{ borderLeftColor: sala?.cor }} aria-labelledby={`pedido-${pedido.id}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`pedido-${pedido.id}`} className="text-xl font-extrabold">
          Pedido nº {numeroPedido(pedido.id)}
        </h2>
        <span className="text-suave">
          Recebido em {new Date(pedido.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>

      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
        <dt className="font-bold">Responsável</dt>
        <dd>
          {pedido.responsavel ?? "—"} {pedido.telefone && `— ${formatarTelefone(pedido.telefone)}`}
        </dd>
        <dt className="font-bold">Pastoral</dt>
        <dd>{pedido.pastoral}</dd>
        <dt className="font-bold">Sala</dt>
        <dd>{sala ? <NomeSala sala={sala} /> : "—"}</dd>
        <dt className="font-bold">Quando</dt>
        <dd className="first-letter:uppercase">
          {formatarDataLonga(original.data)}, das {formatarHora(original.inicio)} às {formatarHora(original.fim)}
        </dd>
        <dt className="font-bold">Atividade</dt>
        <dd>{pedido.atividade}</dd>
        <dt className="font-bold">Pessoas</dt>
        <dd>
          {pedido.pessoas}
          {sala && pedido.pessoas > sala.capacidade && <strong className="text-aviso"> (a sala comporta até {sala.capacidade})</strong>}
        </dd>
        {pedido.recorrencia_pedida && (
          <>
            <dt className="font-bold">Repetição pedida</dt>
            <dd>{pedido.recorrencia_pedida}</dd>
          </>
        )}
      </dl>

      {sit?.tipo === "ocupada" && (
        <Aviso tipo="erro">Atenção: a sala já está ocupada neste horário ({sit.evento.pastoral}). Use “Editar e confirmar” para trocar.</Aviso>
      )}
      {sit?.tipo === "pendente" && <Aviso tipo="aviso">Há outro pedido aguardando para esta sala neste horário.</Aviso>}

      {modo !== "recusar" && <CampoChave valor={chave} aoMudar={setChave} nome={`chave-${pedido.id}`} />}

      {modo === "editar" && (
        <div className="rounded-xl border-2 border-primaria p-3">
          <p className="mb-2 font-bold">Troque a sala ou o horário:</p>
          <CamposPeriodo salas={salas.filter((s) => s.ativa)} valor={periodo} aoMudar={mudarPeriodo} ignorarId={pedido.id} pessoas={pedido.pessoas} />
        </div>
      )}

      {modo === "recusar" && (
        <div>
          <label htmlFor={`motivo-${pedido.id}`} className="rotulo">Motivo (vai na mensagem)</label>
          <textarea
            id={`motivo-${pedido.id}`}
            className="campo"
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Exemplo: sala já reservada para outra atividade"
          />
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {modo === "ver" && (
          <>
            <button type="button" className="botao botao-primario" disabled={salvando} onClick={() => confirmar(original)}>
              <Icone nome="check" /> Confirmar
            </button>
            <button type="button" className="botao botao-secundario" disabled={salvando} onClick={() => setModo("editar")}>
              <Icone nome="lapis" /> Editar e confirmar
            </button>
            <button type="button" className="botao botao-perigo" disabled={salvando} onClick={() => setModo("recusar")}>
              <Icone nome="fechar" /> Não aprovar
            </button>
          </>
        )}
        {modo === "editar" && (
          <button type="button" className="botao botao-primario" disabled={salvando} onClick={() => confirmar(periodo)}>
            <Icone nome="check" /> {salvando ? "Salvando..." : "Confirmar com as mudanças"}
          </button>
        )}
        {modo === "recusar" && (
          <button type="button" className="botao botao-perigo" disabled={salvando || !motivo.trim()} onClick={recusar}>
            <Icone nome="fechar" /> {salvando ? "Salvando..." : "Não aprovar o pedido"}
          </button>
        )}
        {modo !== "ver" && (
          <button
            type="button"
            className="botao botao-secundario"
            disabled={salvando}
            onClick={() => {
              setModo("ver");
              setPeriodo(original);
              setChave(pedido.buscar_chave);
              setErro("");
            }}
          >
            Voltar
          </button>
        )}
      </div>
    </article>
  );
}
