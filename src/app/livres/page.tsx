import Link from "next/link";
import { NomeSala } from "@/components/agenda/comum";
import { Icone } from "@/components/Icone";
import { listarEventos, listarSalas, obterConfig } from "@/lib/dados";
import { formatarHora, horaParaMinutos, intervaloDias, partesLocais } from "@/lib/tempo";

export const metadata = { title: "Salas livres agora" };

export default async function PaginaLivres() {
  const agora = new Date();
  const local = partesLocais(agora);
  const { ate } = intervaloDias(local.data, 1);
  const [salas, eventos, config] = await Promise.all([
    listarSalas(),
    listarEventos(agora.toISOString(), ate),
    obterConfig(),
  ]);

  const confirmados = eventos.filter((e) => e.situacao === "confirmada");
  const situacao = salas.map((sala) => {
    const daSala = confirmados.filter((e) => e.sala_id === sala.id);
    const atual = daSala.find((e) => new Date(e.inicio) <= agora);
    const proximo = daSala.find((e) => new Date(e.inicio) > agora);
    return { sala, atual, proximo };
  });
  const livres = situacao.filter((s) => !s.atual);
  const ocupadas = situacao.filter((s) => s.atual);
  const foraDoHorario =
    local.minutos < horaParaMinutos(config.hora_abertura) || local.minutos >= horaParaMinutos(config.hora_fechamento);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="titulo-pagina">Salas livres agora</h1>
      <p className="text-xl">
        Agora são <strong>{formatarHora(local.hora)}</strong>.
      </p>
      {foraDoHorario && (
        <p className="cartao font-semibold">
          A paróquia funciona das {formatarHora(config.hora_abertura)} às {formatarHora(config.hora_fechamento)}.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold text-sucesso">Livres ({livres.length})</h2>
        {livres.length === 0 && <p className="cartao">Nenhuma sala livre neste momento.</p>}
        {livres.map(({ sala, proximo }) => (
          <div key={sala.id} className="cartao border-l-[10px]" style={{ borderLeftColor: sala.cor }}>
            <p className="text-xl">
              <NomeSala sala={sala} />
            </p>
            <p className="font-semibold text-sucesso">
              {proximo ? `Livre até as ${formatarHora(partesLocais(proximo.inicio).hora)}` : "Livre pelo resto do dia"}
            </p>
            <p>Até {sala.capacidade} pessoas</p>
            <Link href={`/pedir?sala=${sala.id}`} className="botao botao-secundario mt-2">
              <Icone nome="mais" /> Pedir esta sala
            </Link>
          </div>
        ))}
      </section>

      {ocupadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-extrabold text-perigo">Ocupadas ({ocupadas.length})</h2>
          {ocupadas.map(({ sala, atual }) => (
            <div key={sala.id} className="cartao border-l-[10px]" style={{ borderLeftColor: sala.cor }}>
              <p className="text-xl">
                <NomeSala sala={sala} />
              </p>
              <p className="font-semibold text-perigo">
                Ocupada até as {formatarHora(partesLocais(atual!.fim).hora)} — {atual!.pastoral}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
