"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/Aviso";
import type { Sala } from "@/lib/tipos";
import { salvarReserva, type DadosReserva } from "../acoes";
import { CampoChave, CamposPeriodo, JanelaRetorno, type Periodo } from "../componentes";

export type ValoresReserva = Omit<DadosReserva, "salaId" | "data" | "inicio" | "fim"> & { periodo: Periodo };

export function FormReserva({ salas, inicial }: { salas: Sala[]; inicial: ValoresReserva }) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState("");
  const [retorno, setRetorno] = useState<{ mensagem: string; link: string | null } | null>(null);
  const [salvando, iniciar] = useTransition();

  const mudar = <K extends keyof ValoresReserva>(campo: K, valor: ValoresReserva[K]) => setV((a) => ({ ...a, [campo]: valor }));

  function mudarPeriodo(p: Periodo) {
    if (p.salaId !== v.periodo.salaId) {
      const nova = salas.find((s) => s.id === p.salaId);
      if (nova) setV((a) => ({ ...a, buscarChave: nova.precisa_chave }));
    }
    mudar("periodo", p);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const { periodo, ...resto } = v;
    iniciar(async () => {
      const r = await salvarReserva({ ...resto, ...periodo });
      if ("erro" in r) setErro(r.erro);
      else setRetorno(r);
    });
  }

  return (
    <form onSubmit={salvar} className="cartao space-y-4">
      <div>
        <label htmlFor="responsavel" className="rotulo">Responsável</label>
        <input id="responsavel" className="campo" required value={v.responsavel} onChange={(e) => mudar("responsavel", e.target.value)} />
      </div>
      <div>
        <label htmlFor="telefone" className="rotulo">Telefone / WhatsApp (opcional)</label>
        <input id="telefone" type="tel" className="campo" value={v.telefone} onChange={(e) => mudar("telefone", e.target.value)} />
      </div>
      <div>
        <label htmlFor="pastoral" className="rotulo">Pastoral ou grupo</label>
        <input id="pastoral" className="campo" required value={v.pastoral} onChange={(e) => mudar("pastoral", e.target.value)} />
      </div>
      <CamposPeriodo salas={salas} valor={v.periodo} aoMudar={mudarPeriodo} ignorarId={v.id} pessoas={v.pessoas} />
      <div>
        <label htmlFor="atividade" className="rotulo">Atividade</label>
        <textarea id="atividade" className="campo" rows={2} required value={v.atividade} onChange={(e) => mudar("atividade", e.target.value)} />
      </div>
      <div>
        <label htmlFor="pessoas" className="rotulo">Estimativa de pessoas</label>
        <input
          id="pessoas"
          type="number"
          min={0}
          className="campo"
          value={v.pessoas || ""}
          onChange={(e) => mudar("pessoas", Number(e.target.value))}
        />
      </div>
      <CampoChave valor={v.buscarChave} aoMudar={(b) => mudar("buscarChave", b)} nome="chave" />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Salvando..." : v.id ? "Salvar as mudanças" : "Salvar a reserva"}
      </button>
      {retorno && (
        <JanelaRetorno
          titulo="Reserva salva"
          mensagem={retorno.link ? retorno.mensagem : ""}
          link={retorno.link}
          aoFechar={() => router.push("/painel/reservas")}
        />
      )}
    </form>
  );
}
