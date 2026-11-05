import Link from "next/link";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { exigirAdmin, listarSalas } from "@/lib/dados";

export const metadata = { title: "Cadastro de salas" };

export default async function PaginaAdminSalas() {
  await exigirAdmin();
  const salas = await listarSalas(true);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="titulo-pagina mr-auto">Cadastro de salas</h1>
        <Link href="/admin/salas/nova" className="botao botao-primario">
          <Icone nome="mais" /> Nova sala
        </Link>
      </div>
      {salas.length === 0 && <p className="cartao">Nenhuma sala cadastrada. Comece pela primeira.</p>}
      <ul className="space-y-3">
        {salas.map((s) => (
          <li key={s.id} className="cartao flex flex-wrap items-center gap-3 border-l-[10px]" style={{ borderLeftColor: s.cor }}>
            <div className="mr-auto">
              <p className="text-xl">
                <NomeSala sala={s} />
              </p>
              <p>
                Até {s.capacidade} pessoas · {s.fotos_sala?.length ?? 0} foto(s)
                {!s.ativa && <strong className="text-perigo"> · Inativa</strong>}
              </p>
            </div>
            <Link href={`/admin/salas/${s.id}`} className="botao botao-secundario">
              <Icone nome="lapis" /> Editar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
