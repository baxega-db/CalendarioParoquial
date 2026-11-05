import { HistoricoGeral } from "@/components/Historico";
import { exigirEquipe } from "@/lib/dados";

export const metadata = { title: "Histórico" };

export default async function PaginaHistorico() {
  await exigirEquipe();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="titulo-pagina">Histórico</h1>
      <p>Quem criou, aprovou, alterou ou cancelou cada reserva. Os 200 registros mais recentes aparecem primeiro.</p>
      <HistoricoGeral />
    </div>
  );
}
