import { notFound } from "next/navigation";
import { HistoricoReserva } from "@/components/Historico";
import { exigirEquipe, listarSalas } from "@/lib/dados";
import { descreverRegra, descreverTermino, type Regra, type Termino } from "@/lib/recorrencia";
import { criarClienteServidor } from "@/lib/supabase/server";
import { partesLocais } from "@/lib/tempo";
import { numeroPedido } from "@/lib/whatsapp";
import { FormReserva } from "../FormReserva";

export const metadata = { title: "Editar reserva" };

export default async function PaginaEditarReserva({ params }: { params: Promise<{ id: string }> }) {
  await exigirEquipe();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const supabase = await criarClienteServidor();
  const [{ data: r }, salas] = await Promise.all([
    supabase.from("reservas").select("*, series(regra, data_inicio)").eq("id", Number(id)).eq("situacao", "confirmada").maybeSingle(),
    listarSalas(true),
  ]);
  if (!r) notFound();
  const inicio = partesLocais(r.inicio);
  const serie = r.series as { regra: Regra & { termino?: Termino }; data_inicio: string } | null;
  const textoSerie = serie
    ? `${descreverRegra(serie.regra, serie.data_inicio)}${serie.regra.termino ? `, ${descreverTermino(serie.regra.termino)}` : ""}`
    : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">Editar reserva nº {numeroPedido(r.id)}</h1>
      <FormReserva
        salas={salas.filter((s) => s.ativa || s.id === r.sala_id)}
        serie={textoSerie}
        inicial={{
          id: r.id,
          periodo: { salaId: r.sala_id, data: inicio.data, inicio: inicio.hora, fim: partesLocais(r.fim).hora },
          pastoral: r.pastoral,
          atividade: r.atividade,
          pessoas: r.pessoas,
          responsavel: r.responsavel ?? "",
          telefone: r.telefone ?? "",
          buscarChave: r.buscar_chave,
        }}
      />
      <HistoricoReserva reservaId={r.id} />
    </div>
  );
}
