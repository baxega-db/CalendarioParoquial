import { Aviso } from "@/components/Aviso";
import { exigirEquipe, listarSalas } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hojeISO, partesLocais } from "@/lib/tempo";
import { numeroPedido } from "@/lib/whatsapp";
import { FormReserva, type ValoresReserva } from "../FormReserva";

export const metadata = { title: "Nova reserva" };

export default async function PaginaNovaReserva({ searchParams }: { searchParams: Promise<{ copiar?: string }> }) {
  await exigirEquipe();
  const { copiar } = await searchParams;
  const salas = await listarSalas();

  let inicial: ValoresReserva = {
    periodo: { salaId: "", data: hojeISO(), inicio: "", fim: "" },
    pastoral: "",
    atividade: "",
    pessoas: 0,
    responsavel: "",
    telefone: "",
    buscarChave: false,
  };
  let origem: { id: number; dica: string | null } | null = null;

  // "Criar as próximas datas" a partir de um pedido com repetição.
  if (copiar && /^\d+$/.test(copiar)) {
    const supabase = await criarClienteServidor();
    const { data: r } = await supabase.from("reservas").select("*").eq("id", Number(copiar)).maybeSingle();
    if (r) {
      const inicio = partesLocais(r.inicio);
      inicial = {
        periodo: { salaId: r.sala_id, data: inicio.data, inicio: inicio.hora, fim: partesLocais(r.fim).hora },
        pastoral: r.pastoral,
        atividade: r.atividade,
        pessoas: r.pessoas,
        responsavel: r.responsavel ?? "",
        telefone: r.telefone ?? "",
        buscarChave: r.buscar_chave,
      };
      origem = { id: r.id, dica: r.recorrencia_pedida };
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">Nova reserva</h1>
      <p>A reserva feita aqui já entra confirmada na agenda.</p>
      {origem && (
        <Aviso tipo="info">
          Dados copiados do pedido nº {numeroPedido(origem.id)}. A primeira data já está confirmada por esse pedido: na lista
          ela aparece como ocupada e fica de fora.
        </Aviso>
      )}
      <FormReserva salas={salas} inicial={inicial} dica={origem?.dica ?? (origem ? "" : undefined)} />
    </div>
  );
}
