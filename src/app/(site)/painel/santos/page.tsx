import Link from "next/link";
import { exigirEquipe, listarSantos } from "@/lib/dados";
import { NOMES_DIAS } from "@/lib/recorrencia";
import { diaDaSemana, hojeISO } from "@/lib/tempo";
import { LinhaSanto } from "./LinhaSanto";

export const metadata = { title: "Santo do dia" };

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default async function PaginaSantos({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await exigirEquipe();
  const hoje = hojeISO();
  const { mes: mesParam } = await searchParams;
  const mes = Number(mesParam) >= 1 && Number(mesParam) <= 12 ? Number(mesParam) : Number(hoje.slice(5, 7));
  const santos = await listarSantos();
  const ano = Number(hoje.slice(0, 4));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="titulo-pagina">Santo do dia</h1>
      <p>
        O santo do dia aparece na agenda e no modo TV. O calendário vale para todos os anos. Para tirar o santo de um dia,
        apague o texto e toque em Salvar.
      </p>

      <nav aria-label="Meses" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {MESES.map((nome, i) => (
          <Link
            key={nome}
            href={`/painel/santos?mes=${i + 1}`}
            aria-current={mes === i + 1 ? "page" : undefined}
            className={`botao px-1 ${mes === i + 1 ? "botao-primario" : "botao-secundario"}`}
          >
            {nome.slice(0, 3)}
          </Link>
        ))}
      </nav>

      <section className="cartao">
        <h2 className="text-2xl font-extrabold">{MESES[mes - 1]}</h2>
        <ul className="space-y-3">
          {Array.from({ length: DIAS_NO_MES[mes - 1] }, (_, i) => i + 1).map((dia) => {
            // Dia da semana neste ano (29/02 usa o próximo ano bissexto só para o rótulo).
            const data = `${mes === 2 && dia === 29 ? ano + ((4 - (ano % 4)) % 4) : ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const ehHoje = data === hoje;
            return (
              <LinhaSanto
                key={dia}
                mes={mes}
                dia={dia}
                rotulo={`${dia} de ${MESES[mes - 1].toLowerCase()}${mes === 2 && dia === 29 ? " (anos bissextos)" : ` — ${NOMES_DIAS[diaDaSemana(data)]}`}${ehHoje ? " (hoje)" : ""}`}
                inicial={santos.get(`${mes}-${dia}`) ?? ""}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
