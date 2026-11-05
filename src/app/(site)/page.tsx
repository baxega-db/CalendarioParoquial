import { Agenda, type Visao } from "@/components/agenda/Agenda";
import { listarBloqueadas, listarEventos, listarMissas, listarSalas, listarSantos, obterConfig, santoDoDia } from "@/lib/dados";
import { ehDataValida, hojeISO, inicioDaSemana, inicioDoMes, intervaloDias, partesLocais, somarDias } from "@/lib/tempo";

const VISOES: Visao[] = ["hoje", "sala", "semana", "mes"];

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ v?: string; d?: string }> }) {
  const params = await searchParams;
  const visao = VISOES.includes(params.v as Visao) ? (params.v as Visao) : "hoje";
  const hoje = hojeISO();
  const data = ehDataValida(params.d) ? params.d : hoje;

  const inicioPeriodo =
    visao === "semana" ? inicioDaSemana(data) : visao === "mes" ? inicioDaSemana(inicioDoMes(data)) : data;
  const dias = { hoje: 1, sala: 1, semana: 7, mes: 42 }[visao];
  const { de, ate } = intervaloDias(inicioPeriodo, dias);

  const [salas, eventos, config, bloqueadas, missas, santos] = await Promise.all([
    listarSalas(),
    listarEventos(de, ate),
    obterConfig(),
    listarBloqueadas(inicioPeriodo, somarDias(inicioPeriodo, dias)),
    listarMissas(inicioPeriodo, somarDias(inicioPeriodo, dias)),
    listarSantos(),
  ]);
  const santosDoPeriodo: Record<string, string> = {};
  for (let i = 0; i < dias; i++) {
    const d = somarDias(inicioPeriodo, i);
    const s = santoDoDia(santos, d);
    if (s) santosDoPeriodo[d] = s;
  }

  return (
    <Agenda
      visao={visao}
      data={data}
      hoje={hoje}
      agoraMin={partesLocais(new Date()).minutos}
      inicioPeriodo={inicioPeriodo}
      dias={dias}
      salas={salas}
      eventos={eventos}
      abertura={config.hora_abertura}
      fechamento={config.hora_fechamento}
      missas={missas}
      santos={santosDoPeriodo}
      bloqueadas={Object.fromEntries(bloqueadas.map((b) => [b.data, b.descricao]))}
    />
  );
}
