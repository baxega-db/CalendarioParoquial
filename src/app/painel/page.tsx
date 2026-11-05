import Link from "next/link";
import { Icone } from "@/components/Icone";
import { exigirEquipe, listarSalas } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaPendentes } from "./ListaPendentes";

export const metadata = { title: "Pedidos pendentes" };

export default async function PaginaPainel() {
  await exigirEquipe();
  const supabase = await criarClienteServidor();
  const [{ data: pedidos }, salas] = await Promise.all([
    supabase.from("reservas").select("*").eq("situacao", "pendente").order("criado_em"),
    listarSalas(true),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo-pagina mr-auto">Pedidos pendentes ({pedidos?.length ?? 0})</h1>
        <Link href="/painel/reservas/nova" className="botao botao-secundario">
          <Icone nome="mais" /> Nova reserva
        </Link>
      </div>
      <p>Os mais antigos aparecem primeiro.</p>
      <ListaPendentes pedidos={pedidos ?? []} salas={salas} />
    </div>
  );
}
