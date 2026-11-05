import { listarMissas, listarMissasCadastro } from "@/lib/dados";
import type { MissaPadrao } from "@/lib/missas";
import { descreverRegra } from "@/lib/recorrencia";
import { formatarDataLonga, formatarHora, hojeISO, somarDias } from "@/lib/tempo";

export const metadata = { title: "Horários de missa" };

// Ordem de exibição: domingo primeiro, depois os dias da semana, depois os mensais.
function ordem(p: MissaPadrao) {
  const r = p.regra;
  if (r.tipo === "dias_semana") return Math.min(...r.dias.map((d) => (d === 0 ? 0 : d)));
  return 10 + (r.tipo === "mensal_posicao" ? r.diaSemana : r.dia);
}

export default async function PaginaHorariosMissa() {
  const hoje = hojeISO();
  const [padroes, proximas] = await Promise.all([listarMissasCadastro(), listarMissas(hoje, somarDias(hoje, 60), true)]);
  const ativos = padroes.filter((p) => p.ativa);

  // Agrupa por local e, dentro dele, junta os horários de uma mesma regra.
  const porLocal = new Map<string, Map<string, { ordem: number; horas: string[]; obs: string[] }>>();
  for (const p of ativos) {
    const grupos = porLocal.get(p.local) ?? new Map();
    const chave = descreverRegra(p.regra, hoje);
    const g = grupos.get(chave) ?? { ordem: ordem(p), horas: [], obs: [] };
    g.horas.push(formatarHora(p.hora));
    if (p.descricao) g.obs.push(`${formatarHora(p.hora)}: ${p.descricao}`);
    grupos.set(chave, g);
    porLocal.set(p.local, grupos);
  }

  const especiais = proximas.filter((m) => m.avulsaId || m.cancelada);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="titulo-pagina">Horários de missa</h1>
      {ativos.length === 0 && <p className="cartao">Os horários ainda não foram cadastrados.</p>}

      {[...porLocal.entries()].map(([local, grupos]) => (
        <section key={local} className="cartao space-y-3">
          <h2 className="text-2xl font-extrabold">{local}</h2>
          <ul className="space-y-2">
            {[...grupos.entries()]
              .sort((a, b) => a[1].ordem - b[1].ordem)
              .map(([regra, g]) => (
                <li key={regra} className="border-t border-borda/30 pt-2">
                  <p className="text-lg font-bold">{regra}</p>
                  <p className="text-xl">{g.horas.sort().join(" · ")}</p>
                  {g.obs.length > 0 && <p className="text-suave">{g.obs.join("; ")}</p>}
                </li>
              ))}
          </ul>
        </section>
      ))}

      {especiais.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-extrabold">Mudanças nos próximos dias</h2>
          <ul className="space-y-2">
            {especiais.map((m) => (
              <li key={m.chave} className={`cartao ${m.cancelada ? "border-2 border-perigo" : "border-2 border-sucesso"}`}>
                <p className="font-bold first-letter:uppercase">{formatarDataLonga(m.data)}</p>
                <p>
                  {m.cancelada ? (
                    <strong className="text-perigo">Não haverá a missa das {formatarHora(m.hora)}</strong>
                  ) : (
                    <strong className="text-sucesso">Missa a mais às {formatarHora(m.hora)}</strong>
                  )}{" "}
                  — {m.local}
                  {m.descricao && ` (${m.descricao})`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
