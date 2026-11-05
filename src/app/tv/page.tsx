import type { Metadata } from "next";
import { listarBloqueadas, listarEventos, listarMissas, listarSalas, listarSantos, obterConfig, santoDoDia } from "@/lib/dados";
import { agruparPorDia, DURACAO_MISSA_MIN } from "@/lib/missas";
import type { EventoPublico, Sala } from "@/lib/tipos";
import { DIAS_CURTOS, diaDaSemana, formatarDataLonga, formatarHora, hojeISO, horaParaMinutos, intervaloDias, partesLocais, somarDias } from "@/lib/tempo";
import { formatarTelefone } from "@/lib/whatsapp";
import { ControlesTV } from "./ControlesTV";

export const metadata: Metadata = { title: "Modo TV" };

const MAXIMO_NA_TELA = 8;
// Missas de hoje até o mesmo dia da semana que vem (ex.: quarta a quarta).
const DIAS_DE_MISSA = 8;

function Linha({ ev, sala, agora }: { ev: EventoPublico; sala: Sala; agora: Date }) {
  const acontecendo = new Date(ev.inicio) <= agora;
  return (
    <li
      className={`flex items-center gap-[0.8em] rounded-[0.5em] border-l-[0.5em] p-[0.5em] ${acontecendo ? "bg-white/15" : "bg-white/5"}`}
      style={{ borderLeftColor: sala.cor }}
    >
      <span className="w-[6.5em] shrink-0 text-[1.3em] font-extrabold tabular-nums">
        {formatarHora(partesLocais(ev.inicio).hora)}–{formatarHora(partesLocais(ev.fim).hora)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-[0.4em] text-[1.2em] font-bold">
          <span className="inline-block h-[0.9em] w-[0.9em] shrink-0 rounded-full border border-white/60" style={{ background: sala.cor }} aria-hidden="true" />
          {sala.nome}
        </span>
        <span className="block truncate">
          <strong>{ev.pastoral}</strong> — {ev.atividade}
        </span>
      </span>
      {acontecendo && (
        <span className="shrink-0 rounded-[0.3em] bg-amber-300 px-[0.5em] py-[0.1em] font-extrabold text-black">AGORA</span>
      )}
    </li>
  );
}

// Agenda do dia em tela cheia, para um monitor na secretaria ou na entrada.
// Atualiza sozinha a cada minuto (ControlesTV).
export default async function PaginaTV() {
  const agora = new Date();
  const hoje = hojeISO();
  const amanha = somarDias(hoje, 1);
  const { de, ate } = intervaloDias(hoje, 2);
  const [salas, eventos, config, bloqueadas, missasSemana, santos] = await Promise.all([
    listarSalas(),
    listarEventos(de, ate),
    obterConfig(),
    listarBloqueadas(hoje, somarDias(hoje, 2)),
    listarMissas(hoje, somarDias(hoje, DIAS_DE_MISSA)),
    listarSantos(),
  ]);
  const santo = santoDoDia(santos, hoje);
  const minutosAgora = partesLocais(agora).minutos;
  // Hoje, só as missas que ainda não terminaram (contamos 1 hora de duração).
  const missasPorDia = agruparPorDia(
    missasSemana.filter((m) => m.data !== hoje || horaParaMinutos(m.hora) + DURACAO_MISSA_MIN > minutosAgora),
  );
  // O local mais comum fica no título; nas missas, só aparece quando é outro.
  const contagemLocais = new Map<string, number>();
  missasSemana.forEach((m) => contagemLocais.set(m.local, (contagemLocais.get(m.local) ?? 0) + 1));
  const localPrincipal = [...contagemLocais.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const variosLocais = contagemLocais.size > 1;
  const nomeDia = (d: string) =>
    d === hoje ? "Hoje" : d === amanha ? "Amanhã" : `${DIAS_CURTOS[diaDaSemana(d)]} ${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;

  const mapaSalas = new Map(salas.map((s) => [s.id, s]));
  const confirmados = eventos.filter((e) => e.situacao === "confirmada" && mapaSalas.has(e.sala_id));
  const restantesHoje = confirmados.filter((e) => partesLocais(e.inicio).data === hoje && new Date(e.fim) > agora);
  const deAmanha = confirmados.filter((e) => partesLocais(e.inicio).data === amanha);
  const mostrarAmanha = restantesHoje.length === 0;
  const lista = mostrarAmanha ? deAmanha : restantesHoje;
  const bloqueio = bloqueadas.find((b) => b.data === (mostrarAmanha ? amanha : hoje))?.descricao;

  const livres = salas
    .filter((s) => !confirmados.some((e) => e.sala_id === s.id && new Date(e.inicio) <= agora && new Date(e.fim) > agora))
    .map((s) => ({
      sala: s,
      proximo: confirmados.find((e) => e.sala_id === s.id && partesLocais(e.inicio).data === hoje && new Date(e.inicio) > agora),
    }));

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "");

  return (
    <div
      id="tela-tv"
      className="flex min-h-dvh flex-col gap-[0.8em] bg-[#0b1730] px-[1.2em] py-[0.9em] text-white"
      // --ajuste-tv diminui a letra quando o conteúdo do dia não cabe na tela (ControlesTV).
      style={{ fontSize: "calc(clamp(18px, 1.55vw, 40px) * var(--ajuste-tv, 1))" }}
    >
      <header className="flex flex-wrap items-end justify-between gap-[1em] border-b-2 border-white/30 pb-[0.6em]">
        <div className="flex items-center gap-[0.8em]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-paroquia.jpg"
            alt={`Brasão da ${config.nome_paroquia}`}
            className="h-[3.6em] w-[3.6em] shrink-0 rounded-full bg-white object-contain p-[0.25em]"
          />
          <div>
            <p className="text-[1.1em] font-semibold text-white/80">{config.nome_paroquia}</p>
            <h1 className="text-[1.9em] font-extrabold leading-tight first-letter:uppercase">
              Hoje, {formatarDataLonga(hoje)}
            </h1>
            {santo && (
              <p className="line-clamp-2 text-[1.15em] text-amber-100">
                <strong>Santo do dia:</strong> {santo}
              </p>
            )}
          </div>
        </div>
        <ControlesTV />
      </header>

      <div className="grid flex-1 content-start gap-x-[1.2em] gap-y-[0.8em] lg:grid-cols-[1fr_1.25fr]">
        <section className="lg:col-start-1 lg:row-start-1">
          <h2 className="mb-[0.5em] text-[1.4em] font-extrabold">
            {mostrarAmanha ? `Amanhã, ${formatarDataLonga(amanha)}` : "Programação de hoje"}
          </h2>
          {mostrarAmanha && <p className="mb-[0.5em] text-white/80">Não há mais atividades hoje.</p>}
          {bloqueio && <p className="mb-[0.5em] font-bold text-amber-300">Data bloqueada: {bloqueio}</p>}
          {lista.length === 0 ? (
            <p className="text-[1.2em]">Nenhuma atividade marcada.</p>
          ) : (
            <ul className="space-y-[0.4em]">
              {lista.slice(0, MAXIMO_NA_TELA).map((ev) => (
                <Linha key={ev.id} ev={ev} sala={mapaSalas.get(ev.sala_id)!} agora={agora} />
              ))}
            </ul>
          )}
          {lista.length > MAXIMO_NA_TELA && (
            <p className="mt-[0.5em] font-semibold">E mais {lista.length - MAXIMO_NA_TELA} atividade(s) depois.</p>
          )}
        </section>

        <section className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <h2 className="text-[1.4em] font-extrabold">Missas</h2>
          {localPrincipal && (
            <p className="mb-[0.5em] text-white/80">
              {variosLocais ? `Na ${localPrincipal}, salvo indicação` : `Na ${localPrincipal}`}
            </p>
          )}
          {missasPorDia.size === 0 ? (
            <p>Nenhuma missa cadastrada para os próximos dias.</p>
          ) : (
            <ul className="space-y-[0.35em]">
              {[...missasPorDia.entries()].map(([dia, missas]) => (
                <li
                  key={dia}
                  className={`flex gap-[0.6em] rounded-[0.5em] px-[0.5em] py-[0.3em] ${dia === hoje ? "border-2 border-amber-200/80 bg-amber-100/15" : "bg-white/5"}`}
                >
                  <span className="w-[5.2em] shrink-0 font-extrabold">{nomeDia(dia)}</span>
                  <span className="flex flex-wrap gap-x-[0.9em] gap-y-[0.1em]">
                    {missas.map((m) => {
                      const acontecendo = dia === hoje && horaParaMinutos(m.hora) <= minutosAgora;
                      return (
                        <span key={m.chave} className="whitespace-nowrap">
                          <strong className="text-[1.15em] tabular-nums">{formatarHora(m.hora)}</strong>
                          {m.local !== localPrincipal && <span className="text-amber-200"> ({m.local})</span>}
                          {acontecendo && (
                            <span className="ml-[0.3em] rounded-[0.3em] bg-amber-300 px-[0.35em] font-extrabold text-black">AGORA</span>
                          )}
                        </span>
                      );
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-start-1 lg:row-start-2">
          <div>
          <h2 className="mb-[0.5em] text-[1.4em] font-extrabold">Salas livres agora</h2>
          {livres.length === 0 ? (
            <p>Todas as salas estão ocupadas.</p>
          ) : (
            <ul className="grid gap-[0.4em] sm:grid-cols-2">
              {livres.map(({ sala, proximo }) => (
                <li key={sala.id} className="rounded-[0.5em] border-l-[0.5em] bg-white/5 px-[0.5em] py-[0.3em]" style={{ borderLeftColor: sala.cor }}>
                  <p className="text-[1.15em] font-bold">{sala.nome}</p>
                  <p className="text-white/85">
                    {proximo ? `Livre até as ${formatarHora(partesLocais(proximo.inicio).hora)}` : "Livre pelo resto do dia"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          </div>
        </section>
      </div>

      <footer className="flex flex-wrap justify-between gap-[1em] border-t-2 border-white/30 pt-[0.5em] text-white/85">
        <span>
          Pedir uma sala: {site ? <strong>{site}/pedir</strong> : "pelo site"} · WhatsApp{" "}
          <strong>{formatarTelefone(config.whatsapp_secretaria)}</strong>
        </span>
        <span>
          Atualizado às {formatarHora(partesLocais(agora).hora)}
        </span>
      </footer>
    </div>
  );
}
