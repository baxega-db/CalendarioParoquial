"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/Aviso";
import { situacaoDaSala } from "@/lib/disponibilidade";
import { gerarDatas, MAXIMO_ENCONTROS } from "@/lib/recorrencia";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { EventoPublico, Sala } from "@/lib/tipos";
import { horaParaMinutos, paraInstante, somarDias } from "@/lib/tempo";
import { criarSerie, salvarReserva, type DadosReserva, type Escopo, type Resultado } from "../acoes";
import { CampoChave, CamposPeriodo, JanelaRetorno, type Periodo } from "../componentes";
import { CamposRepeticao, configInicial, PreviaDatas, type ConfigRepeticao, type LinhaPrevia } from "./Repeticao";

export type ValoresReserva = Omit<DadosReserva, "salaId" | "data" | "inicio" | "fim" | "escopo"> & { periodo: Periodo };

type Previa = {
  chave: string; // configuração usada para gerar; se mudar, a prévia some
  linhas: LinhaPrevia[];
  puladas: string[];
  eventos: EventoPublico[];
  bloqueadas: Map<string, string>;
  cortado: boolean;
};

const ESCOPOS: { valor: Escopo; texto: string }[] = [
  { valor: "este", texto: "Só este encontro" },
  { valor: "proximos", texto: "Este e os próximos" },
  { valor: "todos", texto: "Todos os encontros da série" },
];

export function FormReserva({
  salas,
  inicial,
  serie,
  dica,
}: {
  salas: Sala[];
  inicial: ValoresReserva;
  serie?: string; // descrição da série, quando a reserva faz parte de uma
  dica?: string; // repetição pedida por quem fez o pedido
}) {
  const router = useRouter();
  const [v, setV] = useState(inicial);
  const [erro, setErro] = useState("");
  const [retorno, setRetorno] = useState<Extract<Resultado, { ok: true }> | null>(null);
  const [salvando, iniciar] = useTransition();
  const [repetir, setRepetir] = useState(dica !== undefined);
  const [config, setConfig] = useState<ConfigRepeticao>(() => configInicial(inicial.periodo.data));
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [escopo, setEscopo] = useState<Escopo>("este");

  const novo = !v.id;
  const p = v.periodo;
  const chaveAtual = JSON.stringify([config, p.data, p.inicio, p.fim, p.salaId]);
  const previaValida = previa && previa.chave === chaveAtual ? previa : null;

  const mudar = <K extends keyof ValoresReserva>(campo: K, valor: ValoresReserva[K]) => setV((a) => ({ ...a, [campo]: valor }));

  function mudarPeriodo(novoPeriodo: Periodo) {
    if (novoPeriodo.salaId !== p.salaId) {
      const nova = salas.find((s) => s.id === novoPeriodo.salaId);
      if (nova) setV((a) => ({ ...a, buscarChave: nova.precisa_chave }));
    }
    mudar("periodo", novoPeriodo);
  }

  const horarioOk = !!p.inicio && !!p.fim && horaParaMinutos(p.fim) > horaParaMinutos(p.inicio);

  async function verDatas() {
    setErro("");
    if (!p.salaId || !p.data || !horarioOk) {
      setErro("Escolha a sala, a primeira data e o horário antes de ver as datas.");
      return;
    }
    setCarregando(true);
    const supabase = criarClienteNavegador();
    const limite = config.termino.tipo === "data" ? somarDias(config.termino.ate, 1) : somarDias(p.data, 2 * 366);
    const { data: bloq } = await supabase.from("datas_bloqueadas").select("data, descricao").gte("data", p.data).lt("data", limite);
    const bloqueadas = new Map((bloq ?? []).map((b) => [b.data as string, b.descricao as string]));
    const gerado = gerarDatas(p.data, config.regra, config.termino, (d) => config.pularBloqueadas && bloqueadas.has(d));
    if (gerado.datas.length === 0) {
      setCarregando(false);
      setPrevia(null);
      setErro("Nenhuma data combina com essa repetição. Confira a primeira data e o padrão.");
      return;
    }
    const ultima = gerado.datas.at(-1)!;
    const { data: eventos } = await supabase
      .from("agenda_publica")
      .select("*")
      .lt("inicio", paraInstante(somarDias(ultima, 1), "00:00"))
      .gt("fim", paraInstante(p.data, "00:00"));
    setCarregando(false);
    const lista = (eventos ?? []) as EventoPublico[];
    setPrevia({
      chave: chaveAtual,
      linhas: gerado.datas.map((data) => ({
        data,
        salaId: p.salaId,
        incluir:
          !bloqueadas.has(data) &&
          situacaoDaSala(lista, p.salaId, paraInstante(data, p.inicio), paraInstante(data, p.fim)).tipo !== "ocupada",
      })),
      puladas: gerado.puladas,
      eventos: lista,
      bloqueadas,
      cortado: gerado.cortado,
    });
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    const { periodo, ...resto } = v;
    iniciar(async () => {
      let r: Resultado;
      if (novo && repetir) {
        if (!previaValida) {
          setErro("Toque em “Ver as datas” e confira a lista antes de salvar.");
          return;
        }
        r = await criarSerie({
          ...resto,
          regra: config.regra,
          termino: config.termino,
          primeiraData: periodo.data,
          inicio: periodo.inicio,
          fim: periodo.fim,
          encontros: previaValida.linhas.filter((l) => l.incluir).map(({ data, salaId }) => ({ data, salaId })),
        });
      } else {
        r = await salvarReserva({ ...resto, ...periodo, escopo: serie ? escopo : undefined });
      }
      if ("erro" in r) setErro(r.erro);
      else setRetorno(r);
    });
  }

  const totalIncluido = previaValida?.linhas.filter((l) => l.incluir).length ?? 0;
  const textoBotao = salvando
    ? "Salvando..."
    : novo && repetir
      ? previaValida
        ? `Salvar ${totalIncluido} encontro(s)`
        : "Veja as datas antes de salvar"
      : v.id
        ? "Salvar as mudanças"
        : "Salvar a reserva";

  return (
    <form onSubmit={salvar} className="cartao space-y-4">
      {serie && (
        <fieldset className="space-y-2 rounded-xl border-2 border-primaria p-3">
          <legend className="rotulo">Esta reserva faz parte de uma série ({serie}). O que alterar?</legend>
          {ESCOPOS.map((op) => (
            <label key={op.valor} className={`botao w-full justify-start ${escopo === op.valor ? "botao-primario" : "botao-secundario"}`}>
              <input type="radio" name="escopo" className="sr-only" checked={escopo === op.valor} onChange={() => setEscopo(op.valor)} />
              <span aria-hidden="true">{escopo === op.valor ? "●" : "○"}</span> {op.texto}
            </label>
          ))}
        </fieldset>
      )}

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
      <CamposPeriodo
        salas={salas}
        valor={p}
        aoMudar={mudarPeriodo}
        ignorarId={v.id}
        pessoas={v.pessoas}
        rotuloData={novo && repetir ? "Primeira data" : "Data"}
        travarData={serie && escopo !== "este" ? "Cada encontro continua no seu dia; mudam a sala, o horário e os dados." : undefined}
      />
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

      {novo && (
        <fieldset>
          <legend className="rotulo">Repetir?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[false, true].map((op) => (
              <label key={String(op)} className={`botao ${repetir === op ? "botao-primario" : "botao-secundario"}`}>
                <input type="radio" name="repetir" className="sr-only" checked={repetir === op} onChange={() => setRepetir(op)} />
                {op ? "Sim" : "Não"}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {novo && repetir && (
        <>
          {dica && <Aviso tipo="info">Quem pediu escreveu: “{dica}”</Aviso>}
          <CamposRepeticao data={p.data} valor={config} aoMudar={setConfig} />
          <button type="button" className="botao botao-secundario w-full" onClick={verDatas} disabled={carregando}>
            {carregando ? "Verificando as datas..." : previaValida ? "Ver as datas de novo" : "Ver as datas"}
          </button>
          {previa && !previaValida && <Aviso tipo="aviso">Você mudou a repetição ou o horário. Toque em “Ver as datas” de novo.</Aviso>}
          {previaValida?.cortado && <Aviso tipo="aviso">A lista foi limitada a {MAXIMO_ENCONTROS} encontros. Use uma data final mais próxima.</Aviso>}
          {previaValida && (
            <PreviaDatas
              linhas={previaValida.linhas}
              aoMudar={(linhas) => setPrevia({ ...previaValida, linhas })}
              salas={salas}
              eventos={previaValida.eventos}
              bloqueadas={previaValida.bloqueadas}
              puladas={previaValida.puladas}
              horaInicio={p.inicio}
              horaFim={p.fim}
            />
          )}
        </>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando || (novo && repetir && totalIncluido === 0)}>
        {textoBotao}
      </button>
      {retorno && (
        <JanelaRetorno
          titulo={serie && escopo !== "este" ? "Série alterada" : novo && repetir ? "Série salva" : "Reserva salva"}
          resumo={retorno.resumo}
          mensagem={retorno.link ? retorno.mensagem : ""}
          link={retorno.link}
          aoFechar={() => router.push("/painel/reservas")}
        />
      )}
    </form>
  );
}
