import "server-only";
import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { formatarData, partesLocais } from "@/lib/tempo";
import { numeroPedido } from "@/lib/whatsapp";

const ACOES: Record<string, string> = {
  pedido_recebido: "pedido recebido pelo site",
  reserva_criada: "reserva criada",
  confirmada: "confirmou",
  nao_aprovada: "não aprovou",
  cancelada: "cancelou",
  alterada: "alterou",
  situacao_alterada: "mudou a situação",
  dados_pessoais_apagados: "apagou nome e telefone (limpeza)",
};

type Linha = {
  id: number;
  acao: string;
  em: string;
  usuario_id: string | null;
  reserva_id: number | null;
  reservas: { pastoral: string; inicio: string; salas: { nome: string } | null } | null;
};

function quando(em: string) {
  const p = partesLocais(em);
  return `${formatarData(p.data)} ${p.hora.replace(":", "h")}`;
}

async function carregar(reservaId?: number, limite = 100) {
  const supabase = await criarClienteServidor();
  let consulta = supabase
    .from("historico")
    .select("id, acao, em, usuario_id, reserva_id, reservas(pastoral, inicio, salas(nome))")
    .order("em", { ascending: false })
    .limit(limite);
  if (reservaId) consulta = consulta.eq("reserva_id", reservaId);
  const [{ data }, { data: usuarios }] = await Promise.all([consulta, supabase.from("usuarios").select("id, nome")]);
  const nomes = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));
  return { linhas: (data ?? []) as unknown as Linha[], nomes };
}

function quem(l: Linha, nomes: Map<string, string>) {
  if (l.usuario_id) return nomes.get(l.usuario_id) ?? "Usuário removido";
  return l.acao === "pedido_recebido" ? "Visitante" : "Sistema";
}

export async function HistoricoReserva({ reservaId }: { reservaId: number }) {
  const { linhas, nomes } = await carregar(reservaId);
  if (linhas.length === 0) return null;
  return (
    <section className="cartao space-y-2">
      <h2 className="text-xl font-extrabold">Histórico desta reserva</h2>
      <ul className="space-y-1">
        {[...linhas].reverse().map((l) => (
          <li key={l.id}>
            <strong>{quando(l.em)}</strong> — {quem(l, nomes)}: {ACOES[l.acao] ?? l.acao}
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function HistoricoGeral() {
  const { linhas, nomes } = await carregar(undefined, 200);
  if (linhas.length === 0) return <p className="cartao">Nada registrado ainda.</p>;
  return (
    <ul className="space-y-2">
      {linhas.map((l) => {
        const r = l.reservas;
        return (
          <li key={l.id} className="cartao">
            <p>
              <strong>{quando(l.em)}</strong> — {quem(l, nomes)}: {ACOES[l.acao] ?? l.acao}
            </p>
            {r && l.reserva_id && (
              <p>
                <Link href={`/painel/reservas/${l.reserva_id}`} className="font-bold text-primaria underline">
                  Nº {numeroPedido(l.reserva_id)}
                </Link>{" "}
                · {r.pastoral} · {r.salas?.nome} · {formatarData(partesLocais(r.inicio).data)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
