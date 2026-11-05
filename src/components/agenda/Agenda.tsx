"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Aviso } from "@/components/Aviso";
import { Icone } from "@/components/Icone";
import type { EventoPublico, Sala } from "@/lib/tipos";
import {
  DIAS_CURTOS,
  diaDaSemana,
  formatarDataLonga,
  formatarHora,
  nomeDoMes,
  partesLocais,
  somarDias,
  somarMeses,
} from "@/lib/tempo";
import { usePreferenciaLocal } from "@/lib/usePreferenciaLocal";
import { NomeSala, type EventoComSala } from "./comum";
import { DetalheEvento } from "./DetalheEvento";
import { GradeHorario, type Coluna } from "./GradeHorario";
import { ListaEventos } from "./ListaEventos";
import { VisaoMes } from "./VisaoMes";

export type Visao = "hoje" | "sala" | "semana" | "mes";

const VISOES: { valor: Visao; texto: string }[] = [
  { valor: "hoje", texto: "Dia" },
  { valor: "sala", texto: "Por sala" },
  { valor: "semana", texto: "Semana" },
  { valor: "mes", texto: "Mês" },
];

const CHAVE_FILTRO = "agenda-salas-ocultas";

type Props = {
  visao: Visao;
  data: string;
  hoje: string;
  agoraMin: number;
  inicioPeriodo: string;
  dias: number;
  salas: Sala[];
  eventos: EventoPublico[];
  abertura: string;
  fechamento: string;
  bloqueadas: Record<string, string>; // data -> motivo
};

export function Agenda(props: Props) {
  const { visao, data, hoje, salas } = props;
  const router = useRouter();
  const [salvo, gravar] = usePreferenciaLocal(CHAVE_FILTRO);
  const [aberto, setAberto] = useState<EventoComSala | null>(null);

  const ocultas = useMemo<string[]>(() => {
    try {
      const lista = JSON.parse(salvo ?? "[]");
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }, [salvo]);

  function alternar(id: string) {
    gravar(JSON.stringify(ocultas.includes(id) ? ocultas.filter((x) => x !== id) : [...ocultas, id]));
  }

  const salasVisiveis = salas.filter((s) => !ocultas.includes(s.id));

  const porDia = useMemo(() => {
    const mapaSalas = new Map(salas.map((s) => [s.id, s]));
    const mapa = new Map<string, EventoComSala[]>();
    for (const ev of props.eventos) {
      const sala = mapaSalas.get(ev.sala_id);
      if (!sala || ocultas.includes(sala.id)) continue;
      const dia = partesLocais(ev.inicio).data;
      const lista = mapa.get(dia) ?? [];
      lista.push({ ...ev, sala });
      mapa.set(dia, lista);
    }
    return mapa;
  }, [props.eventos, salas, ocultas]);

  const passo = { hoje: 1, sala: 1, semana: 7, mes: 0 }[visao];
  const anterior = visao === "mes" ? somarMeses(data, -1) : somarDias(data, -passo);
  const proximo = visao === "mes" ? somarMeses(data, 1) : somarDias(data, passo);
  const link = (v: Visao, d: string) => `/?v=${v}&d=${d}`;

  const titulo =
    visao === "mes"
      ? nomeDoMes(data)
      : visao === "semana"
        ? `Semana de ${formatarDataLonga(props.inicioPeriodo).split(", ")[1]} a ${formatarDataLonga(somarDias(props.inicioPeriodo, 6)).split(", ")[1]}`
        : formatarDataLonga(data, true);

  const textoAnterior = { hoje: "Dia anterior", sala: "Dia anterior", semana: "Semana anterior", mes: "Mês anterior" }[visao];
  const textoProximo = { hoje: "Próximo dia", sala: "Próximo dia", semana: "Próxima semana", mes: "Próximo mês" }[visao];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo-pagina mr-auto">Agenda das salas</h1>
        <Link href="/livres" className="botao botao-primario">
          <Icone nome="porta" /> Salas livres agora
        </Link>
        <Link href="/pedir" className="botao botao-secundario">
          <Icone nome="mais" /> Pedir uma sala
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/5 p-1" role="tablist" aria-label="Como ver a agenda">
        {VISOES.map((v) => (
          <Link
            key={v.valor}
            href={link(v.valor, data)}
            role="tab"
            aria-selected={visao === v.valor}
            className={`flex min-h-12 items-center justify-center rounded-lg px-1 text-center font-bold ${
              visao === v.valor ? "bg-primaria text-white" : "text-texto hover:bg-white"
            }`}
          >
            {v.texto}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={link(visao, anterior)} className="botao botao-secundario" aria-label={textoAnterior}>
          <Icone nome="esquerda" />
          <span className="hidden sm:inline">{textoAnterior}</span>
        </Link>
        <Link href={link(visao, hoje)} className="botao botao-secundario">
          Hoje
        </Link>
        <Link href={link(visao, proximo)} className="botao botao-secundario" aria-label={textoProximo}>
          <span className="hidden sm:inline">{textoProximo}</span>
          <Icone nome="direita" />
        </Link>
        <label className="ml-auto flex items-center gap-2">
          <span className="font-bold">Ir para o dia</span>
          <input
            type="date"
            className="campo w-auto"
            value={data}
            onChange={(e) => e.target.value && router.push(link(visao, e.target.value))}
          />
        </label>
      </div>

      <h2 className="text-2xl font-extrabold first-letter:uppercase">{titulo}</h2>
      <p className="font-semibold text-suave">
        Horário de funcionamento: das {formatarHora(props.abertura)} às {formatarHora(props.fechamento)}
      </p>

      <fieldset className="cartao">
        <legend className="px-1 font-bold">Salas (toque para mostrar ou esconder)</legend>
        <div className="flex flex-wrap gap-2">
          {salas.map((s) => {
            const visivel = !ocultas.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => alternar(s.id)}
                aria-pressed={visivel}
                className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 font-semibold ${
                  visivel ? "bg-white" : "border-dashed bg-black/5 text-suave line-through"
                }`}
                style={{ borderColor: visivel ? s.cor : undefined }}
              >
                <span aria-hidden="true" className="text-lg">{visivel ? "☑" : "☐"}</span>
                <NomeSala sala={s} negrito={false} />
              </button>
            );
          })}
        </div>
      </fieldset>

      {salas.length === 0 && <p className="cartao">Nenhuma sala cadastrada ainda.</p>}

      {(visao === "hoje" || visao === "sala") && props.bloqueadas[data] && (
        <Aviso tipo="aviso">Data bloqueada: {props.bloqueadas[data]}</Aviso>
      )}

      {visao === "hoje" && <ListaEventos eventos={porDia.get(data) ?? []} aoAbrir={setAberto} />}

      {visao === "sala" && (
        <GradeHorario
          abertura={props.abertura}
          fechamento={props.fechamento}
          mostrarSala={false}
          aoAbrir={setAberto}
          colunas={salasVisiveis.map<Coluna>((s) => ({
            chave: s.id,
            titulo: <NomeSala sala={s} />,
            eventos: (porDia.get(data) ?? []).filter((e) => e.sala_id === s.id),
            agora: data === hoje ? props.agoraMin : undefined,
          }))}
        />
      )}

      {visao === "semana" && (
        <>
          <Link href={`/imprimir?d=${props.inicioPeriodo}`} className="botao botao-secundario">
            <Icone nome="impressora" /> Imprimir esta semana
          </Link>
          <div className="space-y-5 md:hidden">
            {Array.from({ length: 7 }, (_, i) => somarDias(props.inicioPeriodo, i)).map((dia) => (
              <section key={dia}>
                <h3 className={`mb-2 text-xl font-extrabold first-letter:uppercase ${dia === hoje ? "text-primaria" : ""}`}>
                  {formatarDataLonga(dia)}
                  {dia === hoje && " (hoje)"}
                </h3>
                {props.bloqueadas[dia] && <p className="mb-2 font-bold text-aviso">Data bloqueada: {props.bloqueadas[dia]}</p>}
                <ListaEventos eventos={porDia.get(dia) ?? []} aoAbrir={setAberto} vazio="Nada marcado." />
              </section>
            ))}
          </div>
          <div className="hidden md:block">
            <GradeHorario
              abertura={props.abertura}
              fechamento={props.fechamento}
              mostrarSala
              aoAbrir={setAberto}
              larguraMinima="8rem"
              colunas={Array.from({ length: 7 }, (_, i) => somarDias(props.inicioPeriodo, i)).map<Coluna>((dia) => ({
                chave: dia,
                titulo: (
                  <Link href={link("hoje", dia)} className={`underline-offset-2 hover:underline ${dia === hoje ? "text-primaria" : ""}`}>
                    {DIAS_CURTOS[diaDaSemana(dia)]} {Number(dia.slice(8))}
                    {props.bloqueadas[dia] && <span className="block font-semibold text-aviso">{props.bloqueadas[dia]}</span>}
                  </Link>
                ),
                eventos: porDia.get(dia) ?? [],
                agora: dia === hoje ? props.agoraMin : undefined,
              }))}
            />
          </div>
        </>
      )}

      {visao === "mes" && (
        <VisaoMes
          inicioGrade={props.inicioPeriodo}
          mes={data.slice(0, 7)}
          hoje={hoje}
          eventosPorDia={porDia}
          bloqueadas={props.bloqueadas}
          aoAbrir={setAberto}
        />
      )}

      <p className="flex flex-wrap items-center gap-2">
        <span className="inline-block h-6 w-10 rounded border-2 border-dashed border-aviso evento-pendente" aria-hidden="true" />
        Tracejado = pedido aguardando confirmação da secretaria.
      </p>

      <DetalheEvento evento={aberto} aoFechar={() => setAberto(null)} />
    </div>
  );
}
