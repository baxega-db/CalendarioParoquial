// Datas são tratadas como texto "AAAA-MM-DD" no fuso da paróquia, e horários
// como "HH:MM". O Brasil não tem horário de verão desde 2019, então o fuso de
// São Paulo é sempre -03:00.
export const FUSO = "America/Sao_Paulo";
const DESLOCAMENTO = "-03:00";

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const DIAS_CURTOS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const formatoPartes = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function partesLocais(instante: string | Date) {
  const partes = Object.fromEntries(
    formatoPartes.formatToParts(new Date(instante)).map((p) => [p.type, p.value]),
  );
  const hora = `${partes.hour}:${partes.minute}`;
  return {
    data: `${partes.year}-${partes.month}-${partes.day}`,
    hora,
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
  };
}

export function hojeISO() {
  return partesLocais(new Date()).data;
}

export function ehDataValida(data: string | undefined | null): data is string {
  return !!data && /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(data));
}

export function paraInstante(data: string, hora: string) {
  return new Date(`${data}T${hora}:00${DESLOCAMENTO}`).toISOString();
}

function comoUTC(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deUTC(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function somarDias(data: string, dias: number) {
  const d = comoUTC(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUTC(d);
}

export function somarMeses(data: string, meses: number) {
  const d = comoUTC(data);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + meses);
  return deUTC(d);
}

export function diaDaSemana(data: string) {
  return comoUTC(data).getUTCDay();
}

// A semana começa no domingo, como no calendário da parede.
export function inicioDaSemana(data: string) {
  return somarDias(data, -diaDaSemana(data));
}

export function inicioDoMes(data: string) {
  return `${data.slice(0, 7)}-01`;
}

export function intervaloDias(dataInicial: string, quantidade: number) {
  return { de: paraInstante(dataInicial, "00:00"), ate: paraInstante(somarDias(dataInicial, quantidade), "00:00") };
}

export function horaParaMinutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function formatarData(data: string) {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataLonga(data: string, comAno = false) {
  const d = comoUTC(data);
  const texto = `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
  return comAno ? `${texto} de ${d.getUTCFullYear()}` : texto;
}

export function nomeDoMes(data: string) {
  const d = comoUTC(data);
  return `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

// "19:00" -> "19h00"
export function formatarHora(hora: string) {
  return hora.slice(0, 5).replace(":", "h");
}

export function formatarPeriodo(inicio: string, fim: string) {
  const a = partesLocais(inicio);
  const b = partesLocais(fim);
  return {
    data: a.data,
    texto: `${formatarData(a.data)}, das ${formatarHora(a.hora)} às ${formatarHora(b.hora)}`,
    horaInicio: a.hora,
    horaFim: b.hora,
  };
}

export function seSobrepoem(inicioA: string, fimA: string, inicioB: string, fimB: string) {
  return new Date(inicioA) < new Date(fimB) && new Date(inicioB) < new Date(fimA);
}
