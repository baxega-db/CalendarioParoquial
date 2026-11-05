import Link from "next/link";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { urlFoto } from "@/lib/fotos";
import type { Sala } from "@/lib/tipos";

export function FotoSala({ sala, className = "" }: { sala: Sala; className?: string }) {
  const foto = sala.fotos_sala?.[0];
  if (!foto)
    return (
      <div
        className={`flex aspect-video items-center justify-center rounded-xl px-2 text-center text-xl font-bold text-white ${className}`}
        style={{ background: sala.cor }}
        aria-hidden="true"
      >
        {sala.nome}
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={urlFoto(foto.caminho)} alt={`Foto da ${sala.nome}`} className={`aspect-video w-full rounded-xl object-cover ${className}`} />
  );
}

export function CartaoSala({ sala, children }: { sala: Sala; children?: React.ReactNode }) {
  return (
    <div className="cartao space-y-2 border-l-[10px]" style={{ borderLeftColor: sala.cor }}>
      <FotoSala sala={sala} />
      <h2 className="text-xl">
        <NomeSala sala={sala} />
      </h2>
      <p className="flex items-center gap-2">
        <Icone nome="pessoas" /> Até {sala.capacidade} pessoas
      </p>
      {sala.localizacao && <p>{sala.localizacao}</p>}
      {children}
      <Link href={`/salas/${sala.id}`} className="botao botao-secundario w-full">
        Ver a sala
      </Link>
    </div>
  );
}
