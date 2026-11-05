import { exigirEquipe, listarMissas, listarMissasCadastro } from "@/lib/dados";
import { agruparPorDia } from "@/lib/missas";
import { formatarDataLonga, formatarHora, hojeISO, somarDias } from "@/lib/tempo";
import { AcoesMissa, FormMissaAdicional, FormMissaPadrao, ItemMissaPadrao } from "./Formularios";

export const metadata = { title: "Missas" };

const SEMANAS = 5;

export default async function PaginaMissas() {
  await exigirEquipe();
  const hoje = hojeISO();
  const [padroes, proximas] = await Promise.all([listarMissasCadastro(), listarMissas(hoje, somarDias(hoje, SEMANAS * 7), true)]);
  const locais = [...new Set([...padroes.map((p) => p.local), ...proximas.map((m) => m.local)])].filter(Boolean).sort();
  const porDia = agruparPorDia(proximas);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="titulo-pagina">Missas</h1>
      <p>Os horários aparecem na agenda, no modo TV, na folha impressa e na página pública de horários de missa.</p>

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Horários fixos</h2>
        {padroes.length === 0 && <p className="cartao">Nenhum horário cadastrado ainda.</p>}
        <ul className="space-y-2">
          {padroes.map((m) => (
            <ItemMissaPadrao key={m.id} missa={m} locais={locais} />
          ))}
        </ul>
        <details className="cartao">
          <summary className="botao botao-primario w-full cursor-pointer list-none">Cadastrar novo horário fixo</summary>
          <div className="pt-4">
            <FormMissaPadrao locais={locais} />
          </div>
        </details>
      </section>

      <FormMissaAdicional locais={locais} />

      <section className="space-y-3">
        <h2 className="text-2xl font-extrabold">Próximas {SEMANAS} semanas</h2>
        <p>Para tirar uma missa fixa só num dia (ex.: Sexta-feira Santa), toque em “Não haverá nesta data”.</p>
        {porDia.size === 0 && <p className="cartao">Nenhuma missa neste período.</p>}
        {[...porDia.entries()].map(([dia, missas]) => (
          <div key={dia} className="cartao space-y-2">
            <h3 className="text-lg font-extrabold first-letter:uppercase">{formatarDataLonga(dia)}</h3>
            <ul className="space-y-2">
              {missas.map((m) => (
                <li key={m.chave} className={`flex flex-wrap items-center gap-3 border-t border-borda/30 pt-2 ${m.cancelada ? "text-suave" : ""}`}>
                  <div className="mr-auto">
                    <p className={`font-bold ${m.cancelada ? "line-through" : ""}`}>
                      {formatarHora(m.hora)} — {m.local}
                    </p>
                    <p>
                      {m.avulsaId && "Missa adicional"}
                      {m.descricao && `${m.avulsaId ? " · " : ""}${m.descricao}`}
                      {m.cancelada && <strong className="text-perigo"> Cancelada nesta data</strong>}
                    </p>
                  </div>
                  <AcoesMissa padraoId={m.padraoId} avulsaId={m.avulsaId} data={m.data} cancelada={m.cancelada} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
