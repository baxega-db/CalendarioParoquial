import Link from "next/link";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { exigirEquipe, listarSalas } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { descreverRegra, type Regra } from "@/lib/recorrencia";
import type { Reserva } from "@/lib/tipos";
import { ehDataValida, formatarDataLonga, formatarHora, hojeISO, intervaloDias, partesLocais } from "@/lib/tempo";
import { formatarTelefone, numeroPedido } from "@/lib/whatsapp";
import { BotaoCancelar } from "./BotaoCancelar";

export const metadata = { title: "Reservas" };

const DIAS = 31;

export default async function PaginaReservas({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  await exigirEquipe();
  const { de: deParam } = await searchParams;
  const de = ehDataValida(deParam) ? deParam : hojeISO();
  const intervalo = intervaloDias(de, DIAS);

  const supabase = await criarClienteServidor();
  const [{ data }, salas] = await Promise.all([
    supabase
      .from("reservas")
      .select("*, series(regra, data_inicio)")
      .eq("situacao", "confirmada")
      .lt("inicio", intervalo.ate)
      .gt("fim", intervalo.de)
      .order("inicio"),
    listarSalas(true),
  ]);
  type ComSerie = Reserva & { serie_id: string | null; series: { regra: Regra; data_inicio: string } | null };
  const reservas = (data ?? []) as ComSerie[];
  const mapaSalas = new Map(salas.map((s) => [s.id, s]));

  const porDia = new Map<string, ComSerie[]>();
  for (const r of reservas) {
    const dia = partesLocais(r.inicio).data;
    porDia.set(dia, [...(porDia.get(dia) ?? []), r]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo-pagina mr-auto">Reservas confirmadas</h1>
        <Link href="/painel/reservas/nova" className="botao botao-primario">
          <Icone nome="mais" /> Nova reserva
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="de" className="rotulo">Mostrar a partir de</label>
          <input id="de" name="de" type="date" defaultValue={de} className="campo" />
        </div>
        <button type="submit" className="botao botao-secundario">Mostrar</button>
      </form>
      <p>Próximos {DIAS} dias a partir da data escolhida.</p>

      {reservas.length === 0 && <p className="cartao">Nenhuma reserva confirmada neste período.</p>}

      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} className="space-y-2">
          <h2 className="text-xl font-extrabold first-letter:uppercase">{formatarDataLonga(dia)}</h2>
          {lista.map((r) => {
            const sala = mapaSalas.get(r.sala_id);
            return (
              <article key={r.id} className="cartao space-y-1 border-l-[10px]" style={{ borderLeftColor: sala?.cor }}>
                <p className="text-lg font-extrabold">
                  {formatarHora(partesLocais(r.inicio).hora)} às {formatarHora(partesLocais(r.fim).hora)} — nº {numeroPedido(r.id)}
                </p>
                {sala && <NomeSala sala={sala} />}
                <p>
                  <strong>{r.pastoral}</strong>: {r.atividade}
                </p>
                <p>
                  {r.responsavel ?? "—"} {r.telefone && `— ${formatarTelefone(r.telefone)}`}
                </p>
                {r.series && (
                  <p className="font-semibold">Repete: {descreverRegra(r.series.regra, r.series.data_inicio)}</p>
                )}
                {r.buscar_chave && (
                  <p className="flex items-center gap-1 font-semibold">
                    <Icone nome="chave" /> Buscar a chave na secretaria
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/painel/reservas/${r.id}`} className="botao botao-secundario">
                    <Icone nome="lapis" /> Editar
                  </Link>
                  <BotaoCancelar id={r.id} emSerie={!!r.serie_id} />
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}
