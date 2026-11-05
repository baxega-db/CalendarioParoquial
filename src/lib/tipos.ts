export type Perfil = "editor" | "admin";
export type Situacao = "pendente" | "confirmada" | "recusada" | "cancelada";

export type Sala = {
  id: string;
  nome: string;
  cor: string;
  capacidade: number;
  localizacao: string;
  recursos: string[];
  precisa_chave: boolean;
  observacoes: string;
  ativa: boolean;
  ordem: number;
  fotos_sala?: FotoSala[];
};

export type FotoSala = {
  id: string;
  sala_id: string;
  caminho: string;
  ordem: number;
};

// Linha da visão agenda_publica (sem dados pessoais)
export type EventoPublico = {
  id: number;
  sala_id: string;
  inicio: string;
  fim: string;
  pastoral: string;
  atividade: string;
  pessoas: number;
  situacao: "pendente" | "confirmada";
};

export type Reserva = EventoPublico & {
  situacao: Situacao;
  responsavel: string | null;
  telefone: string | null;
  recorrencia_pedida: string | null;
  buscar_chave: boolean;
  motivo_recusa: string | null;
  origem: "solicitacao" | "secretaria";
  criado_em: string;
};

export type Configuracoes = {
  nome_paroquia: string;
  whatsapp_secretaria: string;
  hora_abertura: string;
  hora_fechamento: string;
};

export const RECURSOS = [
  "Projetor",
  "TV",
  "Som",
  "Ar-condicionado",
  "Ventilador",
  "Mesas",
  "Cadeiras",
  "Acessível para cadeirantes",
] as const;

// 7 cores bem distintas entre si (sempre exibidas junto com o nome da sala)
export const PALETA = [
  { cor: "#1d4ed8", nome: "Azul" },
  { cor: "#15803d", nome: "Verde" },
  { cor: "#b91c1c", nome: "Vermelho" },
  { cor: "#c2410c", nome: "Laranja" },
  { cor: "#7e22ce", nome: "Roxo" },
  { cor: "#854d0e", nome: "Marrom" },
  { cor: "#be185d", nome: "Rosa" },
  { cor: "#0e7490", nome: "Azul-petróleo" },
];
