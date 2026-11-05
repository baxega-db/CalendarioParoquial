import { exigirAdmin, listarSalas } from "@/lib/dados";
import { FormSala } from "../FormSala";

export const metadata = { title: "Nova sala" };

export default async function PaginaNovaSala() {
  await exigirAdmin();
  const salas = await listarSalas(true);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">Nova sala</h1>
      <FormSala coresUsadas={salas.map((s) => s.cor)} />
    </div>
  );
}
