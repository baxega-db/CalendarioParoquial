import type { Metadata } from "next";
import { listarBloqueadas, listarEventos, listarMissas, listarSalas, obterConfig } from "@/lib/dados";
import { DURACAO_MISSA_MIN } from "@/lib/missas";
import type { EventoPublico, Sala } from "@/lib/tipos";
import { formatarDataLonga, formatarHora, hojeISO, horaParaMinutos, intervaloDias, partesLocais, somarDias } from "@/lib/tempo";
import { formatarTelefone } from "@/lib/whatsapp";
import { ControlesTV } from "./ControlesTV";

export const metadata: Metadata = { title: "Modo TV" };

const MAXIMO_NA_TELA = 8;

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
  const [salas, eventos, config, bloqueadas, missasHoje] = await Promise.all([
    listarSalas(),
    listarEventos(de, ate),
    obterConfig(),
    listarBloqueadas(hoje, somarDias(hoje, 2)),
    listarMissas(hoje, amanha),
  ]);
  const minutosAgora = partesLocais(agora).minutos;
  // Missas que ainda não terminaram (contamos 1 hora de duração).
  const missas = missasHoje.filter((m) => horaParaMinutos(m.hora) + DURACAO_MISSA_MIN > minutosAgora);

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
      className="flex min-h-dvh flex-col gap-[1em] bg-[#0b1730] p-[1.2em] text-white"
      style={{ fontSize: "clamp(18px, 1.7vw, 44px)" }}
    >
      <header className="flex flex-wrap items-end justify-between gap-[1em] border-b-2 border-white/30 pb-[0.6em]">
        <div>
          <p className="text-[1.1em] font-semibold text-white/80">{config.nome_paroquia}</p>
          <h1 className="text-[1.9em] font-extrabold leading-tight first-letter:uppercase">
            Hoje, {formatarDataLonga(hoje)}
          </h1>
        </div>
        <ControlesTV />
      </header>

      <div className="grid flex-1 gap-[1.2em] lg:grid-cols-[2fr_1fr]">
        <section>
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

        <section className="space-y-[1em]">
          {missas.length > 0 && (
            <div className="rounded-[0.5em] border-2 border-amber-200/70 bg-amber-100/10 p-[0.6em]">
              <h2 className="mb-[0.3em] text-[1.4em] font-extrabold">Missas de hoje</h2>
              <ul className="space-y-[0.3em]">
                {missas.map((m) => {
                  const agoraMissa = horaParaMinutos(m.hora) <= minutosAgora;
                  return (
                    <li key={m.chave} className="flex flex-wrap items-baseline gap-x-[0.5em]">
                      <span className="text-[1.3em] font-extrabold tabular-nums">{formatarHora(m.hora)}</span>
                      <span className="font-semibold">{m.local}</span>
                      {m.descricao && <span className="text-white/80">({m.descricao})</span>}
                      {agoraMissa && (
                        <span className="rounded-[0.3em] bg-amber-300 px-[0.4em] font-extrabold text-black">AGORA</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <div>
          <h2 className="mb-[0.5em] text-[1.4em] font-extrabold">Salas livres agora</h2>
          {livres.length === 0 ? (
            <p>Todas as salas estão ocupadas.</p>
          ) : (
            <ul className="space-y-[0.4em]">
              {livres.map(({ sala, proximo }) => (
                <li key={sala.id} className="rounded-[0.5em] border-l-[0.5em] bg-white/5 p-[0.5em]" style={{ borderLeftColor: sala.cor }}>
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
