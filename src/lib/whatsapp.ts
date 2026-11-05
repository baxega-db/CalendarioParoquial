import { formatarPeriodo } from "./tempo";

export function soDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

// Número para o link wa.me: sempre com o código do país (55).
export function numeroInternacional(telefone: string) {
  const d = soDigitos(telefone);
  return d.length <= 11 ? `55${d}` : d;
}

// "19999990000" -> "(19) 99999-0000"
export function formatarTelefone(telefone: string | null) {
  if (!telefone) return "";
  let d = soDigitos(telefone);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

export function linkWhatsApp(telefone: string, mensagem: string) {
  return `https://wa.me/${numeroInternacional(telefone)}?text=${encodeURIComponent(mensagem)}`;
}

export function numeroPedido(id: number) {
  return String(id).padStart(4, "0");
}

type DadosPedido = {
  id: number;
  responsavel: string;
  telefone: string;
  pastoral: string;
  sala: string;
  inicio: string;
  fim: string;
  atividade: string;
  pessoas: number;
  recorrencia?: string | null;
};

export function mensagemSolicitacao(p: DadosPedido) {
  const linhas = [
    `*Solicitação de Sala* — Pedido nº ${numeroPedido(p.id)}`,
    `Responsável: ${p.responsavel} — ${formatarTelefone(p.telefone)}`,
    `Pastoral: ${p.pastoral}`,
    `Sala: ${p.sala}`,
    `Data: ${formatarPeriodo(p.inicio, p.fim).texto}`,
    `Atividade: ${p.atividade}`,
    `Pessoas: ${p.pessoas}`,
  ];
  if (p.recorrencia) linhas.push(`Repetição pedida: ${p.recorrencia}`);
  return linhas.join("\n");
}

type DadosRetorno = {
  id: number;
  sala: string;
  inicio: string;
  fim: string;
  pastoral: string;
};

export function mensagemAprovada(
  p: DadosRetorno & { buscarChave: boolean; mudancas?: { salaAntes?: string; periodoAntes?: string } },
) {
  const linhas = [`*Reserva APROVADA* — Pedido nº ${numeroPedido(p.id)}`];
  const m = p.mudancas;
  if (m?.salaAntes || m?.periodoAntes) {
    const partes = [];
    if (m.salaAntes) partes.push(`a sala (antes: ${m.salaAntes})`);
    if (m.periodoAntes) partes.push(`o horário (antes: ${m.periodoAntes})`);
    linhas.push(`*Atenção: mudamos ${partes.join(" e ")}.*`);
  }
  linhas.push(
    `Sala: ${p.sala}`,
    `Data: ${formatarPeriodo(p.inicio, p.fim).texto}`,
    `Pastoral: ${p.pastoral}`,
  );
  if (p.buscarChave) linhas.push("*BUSCAR A CHAVE NA SECRETARIA* antes do horário.");
  return linhas.join("\n");
}

export function mensagemSerieAprovada(p: {
  descricao: string;
  sala: string;
  pastoral: string;
  horario: string;
  datas: string[]; // "12/11/2026"...
  buscarChave: boolean;
}) {
  const mostrar = p.datas.slice(0, 12);
  const linhas = [
    `*Reserva APROVADA* — ${p.descricao}`,
    `Sala: ${p.sala}`,
    `Horário: ${p.horario}`,
    `Pastoral: ${p.pastoral}`,
    `Datas (${p.datas.length}): ${mostrar.join(", ")}${p.datas.length > mostrar.length ? "..." : ""}`,
  ];
  if (p.buscarChave) linhas.push("*BUSCAR A CHAVE NA SECRETARIA* antes do horário.");
  return linhas.join("\n");
}

export function mensagemNaoAprovada(p: DadosRetorno & { motivo: string }) {
  const motivo = p.motivo.trim().replace(/\.?$/, ".");
  return [
    `*Reserva NÃO APROVADA* — Pedido nº ${numeroPedido(p.id)}`,
    `Sala: ${p.sala}`,
    `Data: ${formatarPeriodo(p.inicio, p.fim).texto}`,
    `Motivo: ${motivo}`,
    "Procure a secretaria para combinar outra data ou sala.",
  ].join("\n");
}
