import Link from "next/link";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { listarBloqueadas, listarEventos, listarMissas, listarSalas, obterConfig } from "@/lib/dados";
import { agruparPorDia, resumoDoDia } from "@/lib/missas";
import {
  ehDataValida,
  formatarDataLonga,
  formatarHora,
  hojeISO,
  inicioDaSemana,
  intervaloDias,
  partesLocais,
  somarDias,
} from "@/lib/tempo";
import { formatarTelefone } from "@/lib/whatsapp";
import { BotaoImprimir } from "./BotaoImprimir";

export const metadata = { title: "Imprimir a semana" };

// Versão da semana para imprimir e afixar no mural (só reservas confirmadas).
export default async function PaginaImprimir({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const inicio = inicioDaSemana(ehDataValida(d) ? d : hojeISO());
  const fimSemana = somarDias(inicio, 6);
  const { de, ate } = intervaloDias(inicio, 7);
  const [salas, eventos, config, bloqueadas, missas] = await Promise.all([
    listarSalas(),
    listarEventos(de, ate),
    obterConfig(),
    listarBloqueadas(inicio, somarDias(inicio, 7)),
    listarMissas(inicio, somarDias(inicio, 7)),
  ]);
  const missasPorDia = agruparPorDia(missas);

  const mapaSalas = new Map(salas.map((s) => [s.id, s]));
  const bloqueio = new Map(bloqueadas.map((b) => [b.data, b.descricao]));
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(inicio, i));
  const confirmados = eventos.filter((e) => e.situacao === "confirmada" && mapaSalas.has(e.sala_id));
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <h1 className="titulo-pagina mr-auto">Imprimir a semana</h1>
        <Link href={`/imprimir?d=${somarDias(inicio, -7)}`} className="botao botao-secundario">
          <Icone nome="esquerda" /> Semana anterior
        </Link>
        <Link href={`/imprimir?d=${somarDias(inicio, 7)}`} className="botao botao-secundario">
          Próxima semana <Icone nome="direita" />
        </Link>
        <BotaoImprimir />
      </div>
      <p className="print:hidden">
        A folha sai deitada (paisagem), só com as reservas confirmadas. Para imprimir em preto e branco, o nome de cada sala
        aparece escrito ao lado da cor.
      </p>

      <article className="rounded-xl border border-borda/50 bg-white p-4 print:rounded-none print:border-0 print:p-0">
        <header className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b-2 border-texto pb-2">
          <div>
            <p className="font-bold">{config.nome_paroquia}</p>
            <h2 className="text-2xl font-extrabold">
              Agenda das salas — {formatarDataLonga(inicio).split(", ")[1]} a {formatarDataLonga(fimSemana, true).split(", ")[1]}
            </h2>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {salas.map((s) => (
              <NomeSala key={s.id} sala={s} negrito={false} />
            ))}
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-7 print:grid-cols-7 print:gap-2">
          {dias.map((dia) => {
            const doDia = confirmados.filter((e) => partesLocais(e.inicio).data === dia);
            return (
              <section key={dia} className="break-inside-avoid border-t-4 border-texto pt-1">
                <h3 className="font-extrabold first-letter:uppercase">{formatarDataLonga(dia)}</h3>
                {bloqueio.get(dia) && <p className="font-bold">✕ {bloqueio.get(dia)}</p>}
                {missasPorDia.get(dia) && <p className="mb-1 font-bold">Missas: {resumoDoDia(missasPorDia.get(dia)!)}</p>}
                {doDia.length === 0 && <p className="text-suave">—</p>}
                <ul className="space-y-2">
                  {doDia.map((ev) => {
                    const sala = mapaSalas.get(ev.sala_id)!;
                    return (
                      <li key={ev.id} className="border-l-[6px] pl-1.5 leading-snug" style={{ borderLeftColor: sala.cor }}>
                        <p className="font-extrabold">
                          {formatarHora(partesLocais(ev.inicio).hora)}–{formatarHora(partesLocais(ev.fim).hora)}
                        </p>
                        <p className="font-semibold">{sala.nome}</p>
                        <p>{ev.pastoral}</p>
                        <p className="text-suave">{ev.atividade}</p>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <footer className="mt-4 border-t border-borda pt-2">
          Para pedir uma sala: {site ? <strong>{site}/pedir</strong> : "pelo site da paróquia"} ou WhatsApp da secretaria{" "}
          <strong>{formatarTelefone(config.whatsapp_secretaria)}</strong>. Horário de funcionamento: das{" "}
          {formatarHora(config.hora_abertura)} às {formatarHora(config.hora_fechamento)}.
        </footer>
      </article>
    </div>
  );
}
