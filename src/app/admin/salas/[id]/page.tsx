import { notFound } from "next/navigation";
import { Aviso } from "@/components/Aviso";
import { exigirAdmin, listarSalas } from "@/lib/dados";
import { FormSala } from "../FormSala";
import { FotosSala } from "../FotosSala";

export const metadata = { title: "Editar sala" };

export default async function PaginaEditarSala({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  await exigirAdmin();
  const [{ id }, { nova }, salas] = await Promise.all([params, searchParams, listarSalas(true)]);
  const sala = salas.find((s) => s.id === id);
  if (!sala) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">{sala.nome}</h1>
      {nova && <Aviso tipo="sucesso">Sala cadastrada. Agora adicione as fotos.</Aviso>}
      <FotosSala salaId={sala.id} fotos={sala.fotos_sala ?? []} />
      <FormSala sala={sala} coresUsadas={salas.map((s) => s.cor)} />
    </div>
  );
}
