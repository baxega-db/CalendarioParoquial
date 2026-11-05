import Link from "next/link";
import { notFound } from "next/navigation";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { listarSalas } from "@/lib/dados";
import { urlFoto } from "@/lib/fotos";

export default async function PaginaSala({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sala = (await listarSalas(true)).find((s) => s.id === id);
  if (!sala) notFound();
  const fotos = sala.fotos_sala ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="titulo-pagina">
        <NomeSala sala={sala} />
      </h1>
      {!sala.ativa && <p className="cartao font-bold text-perigo">Esta sala não está em uso no momento.</p>}
      {fotos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fotos.map((f) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={f.id} src={urlFoto(f.caminho)} alt={`Foto da ${sala.nome}`} className="aspect-video w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
      <dl className="cartao space-y-3">
        <div>
          <dt className="font-bold text-suave">Capacidade</dt>
          <dd>Até {sala.capacidade} pessoas</dd>
        </div>
        {sala.localizacao && (
          <div>
            <dt className="font-bold text-suave">Onde fica</dt>
            <dd>{sala.localizacao}</dd>
          </div>
        )}
        <div>
          <dt className="font-bold text-suave">O que tem na sala</dt>
          <dd>{sala.recursos.length ? sala.recursos.join(", ") : "Não informado"}</dd>
        </div>
        <div>
          <dt className="font-bold text-suave">Chave</dt>
          <dd>{sala.precisa_chave ? "É preciso buscar a chave na secretaria." : "Não precisa buscar a chave."}</dd>
        </div>
        {sala.observacoes && (
          <div>
            <dt className="font-bold text-suave">Observações</dt>
            <dd className="whitespace-pre-line">{sala.observacoes}</dd>
          </div>
        )}
      </dl>
      {sala.ativa && (
        <Link href={`/pedir?sala=${sala.id}`} className="botao botao-primario w-full">
          <Icone nome="mais" /> Pedir esta sala
        </Link>
      )}
    </div>
  );
}
