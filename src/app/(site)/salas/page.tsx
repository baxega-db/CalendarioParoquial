import { CartaoSala } from "@/components/salas/CartaoSala";
import { listarSalas } from "@/lib/dados";

export const metadata = { title: "Conhecer as salas" };

export default async function PaginaSalas() {
  const salas = await listarSalas();
  return (
    <div className="space-y-4">
      <h1 className="titulo-pagina">Conhecer as salas</h1>
      {salas.length === 0 && <p className="cartao">Nenhuma sala cadastrada ainda.</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {salas.map((s) => (
          <CartaoSala key={s.id} sala={s} />
        ))}
      </div>
    </div>
  );
}
