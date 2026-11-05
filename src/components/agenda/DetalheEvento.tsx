"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Icone } from "@/components/Icone";
import { urlFoto } from "@/lib/fotos";
import { formatarDataLonga, partesLocais } from "@/lib/tempo";
import { horario, NomeSala, SeloPendente, type EventoComSala } from "./comum";

export function DetalheEvento({ evento, aoFechar }: { evento: EventoComSala | null; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (evento && !dialogo.open) dialogo.showModal();
    if (!evento && dialogo.open) dialogo.close();
  }, [evento]);

  const foto = evento?.sala.fotos_sala?.[0];

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      className="m-auto w-[min(36rem,calc(100%-1.5rem))] rounded-2xl p-0 backdrop:bg-black/60"
      aria-labelledby="titulo-detalhe"
    >
      {evento && (
        <div className="space-y-3 p-5">
          {foto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={urlFoto(foto.caminho)} alt={`Foto da ${evento.sala.nome}`} className="aspect-video w-full rounded-xl object-cover" />
          )}
          <h2 id="titulo-detalhe" className="text-2xl font-extrabold">
            {evento.pastoral}
          </h2>
          {evento.situacao === "pendente" && <SeloPendente />}
          <dl className="space-y-2">
            <div>
              <dt className="font-bold text-suave">Sala</dt>
              <dd>
                <NomeSala sala={evento.sala} />
              </dd>
            </div>
            <div>
              <dt className="font-bold text-suave">Quando</dt>
              <dd className="first-letter:uppercase">
                {formatarDataLonga(partesLocais(evento.inicio).data)}, das {horario(evento)}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-suave">Atividade</dt>
              <dd>{evento.atividade}</dd>
            </div>
            {evento.pessoas > 0 && (
              <div>
                <dt className="font-bold text-suave">Pessoas (estimativa)</dt>
                <dd>{evento.pessoas}</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Link href={`/salas/${evento.sala.id}`} className="botao botao-secundario flex-1">
              <Icone nome="sala" /> Ver a sala
            </Link>
            <button type="button" onClick={aoFechar} className="botao botao-primario flex-1">
              <Icone nome="fechar" /> Fechar
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
