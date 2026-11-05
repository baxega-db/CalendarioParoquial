import { diaDaSemana, formatarData, somarDias } from "./tempo";

// Padrões de repetição aceitos (guardados em series.regra).
export type Regra =
  | { tipo: "dias_semana"; dias: number[] } // todo dia, nos dias da semana escolhidos
  | { tipo: "semanal"; intervalo: 1 | 2 } // toda semana ou a cada 2 semanas, no dia da 1ª data
  | { tipo: "mensal_posicao"; posicao: 1 | 2 | 3 | 4 | -1; diaSemana: number } // "toda 3ª terça", "último sábado"
  | { tipo: "mensal_dia"; dia: number }; // "todo dia 15"

export type Termino = { tipo: "data"; ate: string } | { tipo: "quantidade"; total: number };

export const MAXIMO_ENCONTROS = 200;
const MAXIMO_DIAS = 2 * 366;

export const NOMES_DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const POSICOES: Record<number, string> = { 1: "1ª", 2: "2ª", 3: "3ª", 4: "4ª", [-1]: "última" };

function diasNoMes(data: string) {
  const [a, m] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function combina(regra: Regra, data: string, inicio: string) {
  const dia = Number(data.slice(8));
  const dow = diaDaSemana(data);
  switch (regra.tipo) {
    case "dias_semana":
      return regra.dias.includes(dow);
    case "semanal": {
      if (dow !== diaDaSemana(inicio)) return false;
      const dias = Math.round((Date.parse(data) - Date.parse(inicio)) / 86400000);
      return Math.floor(dias / 7) % regra.intervalo === 0;
    }
    case "mensal_posicao":
      if (dow !== regra.diaSemana) return false;
      return regra.posicao === -1 ? dia + 7 > diasNoMes(data) : Math.ceil(dia / 7) === regra.posicao;
    case "mensal_dia":
      return dia === regra.dia;
  }
}

// Gera as datas a partir de `inicio` (inclusive). Datas em que `pular` devolve
// verdadeiro (ex.: datas bloqueadas) ficam de fora e não contam no total.
export function gerarDatas(
  inicio: string,
  regra: Regra,
  termino: Termino,
  pular: (data: string) => boolean = () => false,
): { datas: string[]; puladas: string[]; cortado: boolean } {
  const datas: string[] = [];
  const puladas: string[] = [];
  for (let i = 0; i < MAXIMO_DIAS; i++) {
    const data = somarDias(inicio, i);
    if (termino.tipo === "data" && data > termino.ate) return { datas, puladas, cortado: false };
    if (!combina(regra, data, inicio)) continue;
    if (pular(data)) {
      puladas.push(data);
      continue;
    }
    datas.push(data);
    if (termino.tipo === "quantidade" && datas.length >= termino.total) return { datas, puladas, cortado: false };
    if (datas.length >= MAXIMO_ENCONTROS) return { datas, puladas, cortado: true };
  }
  return { datas, puladas, cortado: true };
}

// Sábado e domingo são masculinos: "todo sábado", "último domingo".
const masculino = (dow: number) => dow === 0 || dow === 6;
const CURTOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function lista(itens: string[]) {
  return itens.length > 1 ? `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}` : itens[0];
}

export function descreverRegra(regra: Regra, inicio: string) {
  switch (regra.tipo) {
    case "dias_semana": {
      const dias = [...regra.dias].sort();
      if (dias.length === 7) return "Todos os dias";
      return `Toda semana: ${lista(dias.map((d) => CURTOS[d]))}`;
    }
    case "semanal": {
      const dow = diaDaSemana(inicio);
      const nome = NOMES_DIAS[dow];
      if (regra.intervalo === 2) return `A cada 2 semanas, ${masculino(dow) ? "no" : "na"} ${nome}`;
      return `${masculino(dow) ? "Todo" : "Toda"} ${nome}`;
    }
    case "mensal_posicao": {
      const dow = regra.diaSemana;
      const nome = NOMES_DIAS[dow];
      if (regra.posicao === -1) return `${masculino(dow) ? "Último" : "Última"} ${nome} do mês`;
      const pos = masculino(dow) ? POSICOES[regra.posicao].replace("ª", "º") : POSICOES[regra.posicao];
      return `${masculino(dow) ? "Todo" : "Toda"} ${pos} ${nome} do mês`;
    }
    case "mensal_dia":
      return `Todo dia ${regra.dia} do mês`;
  }
}

export function descreverTermino(termino: Termino) {
  return termino.tipo === "data" ? `até ${formatarData(termino.ate)}` : `${termino.total} encontros`;
}

// Posição do dia da semana no mês (para sugerir "toda 3ª terça" a partir da 1ª data).
export function posicaoNoMes(data: string): 1 | 2 | 3 | 4 | -1 {
  const n = Math.ceil(Number(data.slice(8)) / 7);
  return n === 5 ? -1 : (n as 1 | 2 | 3 | 4); // só existe "5ª" em alguns meses: vira "último"
}
