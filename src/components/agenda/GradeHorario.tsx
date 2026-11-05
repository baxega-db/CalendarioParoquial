import { formatarHora, horaParaMinutos, partesLocais } from "@/lib/tempo";
import { estiloEvento, horario, NomeSala, type EventoComSala } from "./comum";

export type Coluna = {
  chave: string;
  titulo: React.ReactNode;
  eventos: EventoComSala[];
  agora?: number; // minutos do dia, para a linha "agora"
};

const REM_POR_HORA = 4.5;

// Distribui eventos que se sobrepõem lado a lado dentro da coluna.
function posicionar(eventos: EventoComSala[]) {
  const ordenados = [...eventos].sort((a, b) => a.inicio.localeCompare(b.inicio));
  const resultado: { ev: EventoComSala; faixa: number; faixas: number }[] = [];
  let grupo: typeof resultado = [];
  let fimGrupo = "";
  const fechar = () => {
    const total = Math.max(...grupo.map((g) => g.faixa)) + 1;
    grupo.forEach((g) => (g.faixas = total));
    resultado.push(...grupo);
    grupo = [];
  };
  for (const ev of ordenados) {
    if (grupo.length && ev.inicio >= fimGrupo) fechar();
    const ocupadas = new Set(grupo.filter((g) => g.ev.fim > ev.inicio).map((g) => g.faixa));
    let faixa = 0;
    while (ocupadas.has(faixa)) faixa++;
    grupo.push({ ev, faixa, faixas: 1 });
    if (ev.fim > fimGrupo) fimGrupo = ev.fim;
  }
  if (grupo.length) fechar();
  return resultado;
}

export function GradeHorario({
  colunas,
  abertura,
  fechamento,
  mostrarSala,
  aoAbrir,
  larguraMinima = "11rem",
}: {
  colunas: Coluna[];
  abertura: string;
  fechamento: string;
  mostrarSala: boolean;
  aoAbrir: (e: EventoComSala) => void;
  larguraMinima?: string;
}) {
  // A grade cobre o horário de funcionamento, ampliada se houver evento fora dele.
  let inicioMin = Math.floor(horaParaMinutos(abertura) / 60) * 60;
  let fimMin = Math.ceil(horaParaMinutos(fechamento) / 60) * 60;
  for (const c of colunas)
    for (const ev of c.eventos) {
      const a = partesLocais(ev.inicio);
      const b = partesLocais(ev.fim);
      inicioMin = Math.min(inicioMin, Math.floor(a.minutos / 60) * 60);
      fimMin = Math.max(fimMin, b.data > a.data ? 24 * 60 : Math.ceil(b.minutos / 60) * 60);
    }
  const horas: number[] = [];
  for (let m = inicioMin; m < fimMin; m += 60) horas.push(m);
  const altura = (horas.length * REM_POR_HORA).toFixed(2);
  const paraRem = (min: number) => ((Math.max(min, inicioMin) - inicioMin) / 60) * REM_POR_HORA;

  return (
    <div className="overflow-x-auto rounded-xl border border-borda/50 bg-superficie">
      <div
        className="grid"
        style={{ gridTemplateColumns: `4rem repeat(${colunas.length}, minmax(${larguraMinima}, 1fr))` }}
      >
        <div className="sticky left-0 top-0 z-20 border-b border-borda/50 bg-superficie" />
        {colunas.map((c) => (
          <div key={c.chave} className="border-b border-l border-borda/50 bg-superficie p-2 text-center font-bold">
            {c.titulo}
          </div>
        ))}

        <div className="sticky left-0 z-10 bg-superficie" style={{ height: `${altura}rem` }}>
          {horas.map((m) => (
            <div key={m} className="border-t border-borda/30 pr-1 text-right font-semibold" style={{ height: `${REM_POR_HORA}rem` }}>
              {formatarHora(`${String(m / 60).padStart(2, "0")}:00`)}
            </div>
          ))}
        </div>

        {colunas.map((c) => (
          <div key={c.chave} className="relative border-l border-borda/50" style={{ height: `${altura}rem` }}>
            {horas.map((m) => (
              <div key={m} className="border-t border-borda/30" style={{ height: `${REM_POR_HORA}rem` }} />
            ))}
            {c.agora !== undefined && c.agora >= inicioMin && c.agora <= fimMin && (
              <div className="absolute inset-x-0 z-10 border-t-4 border-perigo" style={{ top: `${paraRem(c.agora)}rem` }}>
                <span className="absolute -top-3 left-0 rounded bg-perigo px-1 font-bold text-white">agora</span>
              </div>
            )}
            {posicionar(c.eventos).map(({ ev, faixa, faixas }) => {
              const a = partesLocais(ev.inicio);
              const b = partesLocais(ev.fim);
              const topo = paraRem(a.minutos);
              const fim = b.data > a.data ? fimMin : b.minutos;
              const alturaEv = Math.max(paraRem(fim) - topo, 2.2);
              const pendente = ev.situacao === "pendente";
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => aoAbrir(ev)}
                  className={`absolute overflow-hidden rounded-lg border-2 border-l-8 border-transparent p-1.5 text-left leading-snug hover:z-10 hover:shadow-lg ${
                    pendente ? "evento-pendente" : ""
                  }`}
                  style={{
                    ...estiloEvento(ev.sala.cor, pendente),
                    top: `${topo}rem`,
                    height: `${alturaEv}rem`,
                    left: `calc(${(faixa / faixas) * 100}% + 2px)`,
                    width: `calc(${100 / faixas}% - 4px)`,
                  }}
                >
                  <span className="block font-extrabold">{horario(ev)}</span>
                  {mostrarSala && (
                    <span className="block">
                      <NomeSala sala={ev.sala} />
                    </span>
                  )}
                  <span className="block font-semibold">{ev.pastoral}</span>
                  {pendente && <span className="block font-bold text-aviso">Aguardando confirmação</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
