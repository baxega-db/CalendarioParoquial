"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { horario, NomeSala } from "@/components/agenda/comum";
import { Aviso } from "@/components/Aviso";
import { EscolhaSala } from "@/components/EscolhaSala";
import { Icone } from "@/components/Icone";
import { salasLivres, situacaoDaSala, type SituacaoSala } from "@/lib/disponibilidade";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { Sala } from "@/lib/tipos";
import { horaParaMinutos, paraInstante } from "@/lib/tempo";
import { useEventosDoDia } from "@/lib/useEventosDoDia";
import { linkWhatsApp, mensagemSolicitacao, numeroPedido, soDigitos } from "@/lib/whatsapp";

type Campos = {
  responsavel: string;
  telefone: string;
  pastoral: string;
  data: string;
  inicio: string;
  fim: string;
  sala: string;
  atividade: string;
  pessoas: string;
  recorrente: "nao" | "sim";
  recorrencia: string;
};

type Erros = Partial<Record<keyof Campos, string>>;

const ERROS_BANCO: Record<string, [keyof Campos | null, string]> = {
  NOME_INVALIDO: ["responsavel", "Escreva o nome do responsável."],
  TELEFONE_INVALIDO: ["telefone", "Escreva o telefone com DDD. Exemplo: (19) 99999-0000."],
  PASTORAL_INVALIDA: ["pastoral", "Escreva o nome da pastoral ou grupo."],
  ATIVIDADE_INVALIDA: ["atividade", "Conte em poucas palavras o que vai acontecer."],
  PESSOAS_INVALIDO: ["pessoas", "Escreva quantas pessoas devem vir (um número)."],
  HORARIO_INVALIDO: ["fim", "A hora de término precisa ser depois da hora de início."],
  DATA_PASSADA: ["data", "Escolha uma data e hora que ainda não passaram."],
  SALA_INVALIDA: ["sala", "Esta sala não está disponível para pedidos."],
  SALA_OCUPADA: ["sala", "Esta sala acabou de ser ocupada neste horário. Escolha outra sala ou outro horário."],
};

function mascaraTelefone(valor: string) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function FormPedido({
  salas,
  hoje,
  salaInicial,
  whatsappSecretaria,
}: {
  salas: Sala[];
  hoje: string;
  salaInicial: string;
  whatsappSecretaria: string;
}) {
  const [c, setC] = useState<Campos>({
    responsavel: "",
    telefone: "",
    pastoral: "",
    data: "",
    inicio: "",
    fim: "",
    sala: salas.some((s) => s.id === salaInicial) ? salaInicial : "",
    atividade: "",
    pessoas: "",
    recorrente: "nao",
    recorrencia: "",
  });
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<{ numero: string; link: string } | null>(null);
  const { eventos, bloqueio, recarregar } = useEventosDoDia(c.data);

  const mudar = <K extends keyof Campos>(campo: K, valor: Campos[K]) => {
    setC((atual) => ({ ...atual, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const horarioOk = !!c.data && !!c.inicio && !!c.fim && horaParaMinutos(c.fim) > horaParaMinutos(c.inicio);
  const periodo = horarioOk ? { inicio: paraInstante(c.data, c.inicio), fim: paraInstante(c.data, c.fim) } : null;

  const situacoes = useMemo(() => {
    if (!periodo || !eventos) return null;
    return new Map<string, SituacaoSala>(
      salas.map((s) => [s.id, situacaoDaSala(eventos, s.id, periodo.inicio, periodo.fim)]),
    );
  }, [periodo?.inicio, periodo?.fim, eventos, salas]); // eslint-disable-line react-hooks/exhaustive-deps

  const sala = salas.find((s) => s.id === c.sala);
  const situacao = sala ? situacoes?.get(sala.id) : undefined;
  const pessoas = Number(c.pessoas);
  const alternativas =
    situacao?.tipo === "ocupada" && periodo && eventos ? salasLivres(eventos, salas, periodo.inicio, periodo.fim, sala?.id) : [];

  function validar(): Erros {
    const e: Erros = {};
    if (!c.responsavel.trim()) e.responsavel = "Escreva o nome do responsável.";
    const tel = soDigitos(c.telefone);
    if (tel.length < 10 || tel.length > 11) e.telefone = "Escreva o telefone com DDD. Exemplo: (19) 99999-0000.";
    if (!c.pastoral.trim()) e.pastoral = "Escreva o nome da pastoral ou grupo.";
    if (!c.data) e.data = "Escolha a data.";
    else if (c.data < hoje) e.data = "Esta data já passou. Escolha outra.";
    if (!c.inicio) e.inicio = "Escolha a hora de início.";
    if (!c.fim) e.fim = "Escolha a hora de término.";
    else if (c.inicio && horaParaMinutos(c.fim) <= horaParaMinutos(c.inicio))
      e.fim = "A hora de término precisa ser depois da hora de início.";
    if (!c.sala) e.sala = "Escolha uma sala.";
    else if (situacao?.tipo === "ocupada") e.sala = "Esta sala está ocupada neste horário. Escolha outra.";
    if (!c.atividade.trim()) e.atividade = "Conte em poucas palavras o que vai acontecer.";
    if (!Number.isInteger(pessoas) || pessoas < 1) e.pessoas = "Escreva quantas pessoas devem vir (um número).";
    if (c.recorrente === "sim" && !c.recorrencia.trim()) e.recorrencia = "Conte como se repete. Exemplo: toda 3ª terça-feira.";
    return e;
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErroGeral("");
    const e = validar();
    setErros(e);
    const primeiro = Object.keys(e)[0];
    if (primeiro) {
      document.getElementById(`campo-${primeiro}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!periodo || !sala) return;

    setEnviando(true);
    const { data: id, error } = await criarClienteNavegador().rpc("solicitar_sala", {
      p_sala_id: sala.id,
      p_inicio: periodo.inicio,
      p_fim: periodo.fim,
      p_pastoral: c.pastoral,
      p_atividade: c.atividade,
      p_pessoas: pessoas,
      p_responsavel: c.responsavel,
      p_telefone: soDigitos(c.telefone),
      p_recorrencia: c.recorrente === "sim" ? c.recorrencia : null,
    });
    setEnviando(false);

    if (error || typeof id !== "number") {
      const codigo = Object.keys(ERROS_BANCO).find((k) => error?.message.includes(k));
      if (codigo) {
        const [campo, texto] = ERROS_BANCO[codigo];
        if (campo) setErros({ [campo]: texto });
        else setErroGeral(texto);
        if (codigo === "SALA_OCUPADA") recarregar();
      } else {
        setErroGeral("Não foi possível registrar o pedido agora. Confira a internet e tente de novo.");
      }
      return;
    }

    const mensagem = mensagemSolicitacao({
      id,
      responsavel: c.responsavel.trim(),
      telefone: c.telefone,
      pastoral: c.pastoral.trim(),
      sala: sala.nome,
      inicio: periodo.inicio,
      fim: periodo.fim,
      atividade: c.atividade.trim(),
      pessoas,
      recorrencia: c.recorrente === "sim" ? c.recorrencia.trim() : null,
    });
    const link = linkWhatsApp(whatsappSecretaria, mensagem);
    setEnviado({ numero: numeroPedido(id), link });
    window.scrollTo({ top: 0 });
    window.open(link, "_blank", "noopener");
  }

  if (enviado) {
    return (
      <div className="space-y-5">
        <Aviso tipo="sucesso">
          <p className="text-xl">Seu pedido foi registrado (nº {enviado.numero}).</p>
          <p>Toque em Enviar no WhatsApp para avisar a secretaria.</p>
        </Aviso>
        <a href={enviado.link} target="_blank" rel="noopener" className="botao botao-whatsapp w-full text-xl">
          <Icone nome="whatsapp" tamanho={28} /> Abrir o WhatsApp
        </a>
        <p>O pedido já aparece na agenda como &quot;Aguardando confirmação&quot;. A secretaria vai responder pelo WhatsApp.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="botao botao-secundario flex-1">
            <Icone nome="agenda" /> Ver a agenda
          </Link>
          <button type="button" className="botao botao-secundario flex-1" onClick={() => location.reload()}>
            <Icone nome="mais" /> Fazer outro pedido
          </button>
        </div>
      </div>
    );
  }

  const erro = (campo: keyof Campos) =>
    erros[campo] ? (
      <p id={`erro-${campo}`} className="erro-campo">
        {erros[campo]}
      </p>
    ) : null;
  const attrs = (campo: keyof Campos) => ({
    id: `campo-${campo}`,
    "aria-invalid": !!erros[campo],
    "aria-describedby": erros[campo] ? `erro-${campo}` : undefined,
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-5">
      <div>
        <label htmlFor="campo-responsavel" className="rotulo">Nome do responsável</label>
        <input {...attrs("responsavel")} className="campo" autoComplete="name" value={c.responsavel} onChange={(e) => mudar("responsavel", e.target.value)} />
        {erro("responsavel")}
      </div>

      <div>
        <label htmlFor="campo-telefone" className="rotulo">Telefone / WhatsApp (com DDD)</label>
        <input
          {...attrs("telefone")}
          className="campo"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(19) 99999-0000"
          value={c.telefone}
          onChange={(e) => mudar("telefone", mascaraTelefone(e.target.value))}
        />
        {erro("telefone")}
      </div>

      <div>
        <label htmlFor="campo-pastoral" className="rotulo">Pastoral ou grupo</label>
        <input {...attrs("pastoral")} className="campo" placeholder="Exemplo: Catequese" value={c.pastoral} onChange={(e) => mudar("pastoral", e.target.value)} />
        {erro("pastoral")}
      </div>

      <div>
        <label htmlFor="campo-data" className="rotulo">Data</label>
        <input {...attrs("data")} className="campo" type="date" min={hoje} value={c.data} onChange={(e) => mudar("data", e.target.value)} />
        {erro("data")}
        {bloqueio && (
          <div className="mt-2">
            <Aviso tipo="aviso">Este dia está marcado como “{bloqueio}”. Você pode pedir, mas a secretaria pode não aprovar.</Aviso>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="campo-inicio" className="rotulo">Hora de início</label>
          <input {...attrs("inicio")} className="campo" type="time" step={900} value={c.inicio} onChange={(e) => mudar("inicio", e.target.value)} />
          {erro("inicio")}
        </div>
        <div>
          <label htmlFor="campo-fim" className="rotulo">Hora de término</label>
          <input {...attrs("fim")} className="campo" type="time" step={900} value={c.fim} onChange={(e) => mudar("fim", e.target.value)} />
          {erro("fim")}
        </div>
      </div>

      <fieldset id="campo-sala" aria-describedby={erros.sala ? "erro-sala" : undefined}>
        <legend className="rotulo">Sala</legend>
        {!horarioOk && <p className="mb-2">Escolha a data e o horário para ver quais salas estão livres.</p>}
        {horarioOk && !eventos && <p className="mb-2">Verificando as salas...</p>}
        <EscolhaSala salas={salas} valor={c.sala} aoEscolher={(id) => mudar("sala", id)} situacoes={situacoes} invalido={!!erros.sala} />
        {erro("sala")}
      </fieldset>

      {sala && situacao && (
        <div className="space-y-2" aria-live="polite">
          {situacao.tipo === "livre" && <Aviso tipo="sucesso">Sala livre neste horário.</Aviso>}
          {situacao.tipo === "pendente" && (
            <Aviso tipo="aviso">Já existe um pedido aguardando confirmação neste horário. Você pode enviar; a secretaria decide.</Aviso>
          )}
          {situacao.tipo === "ocupada" && (
            <Aviso tipo="erro">
              <p>
                Sala ocupada: {situacao.evento.pastoral}, das {horario(situacao.evento)}.
              </p>
              {alternativas.length > 0 ? (
                <div className="mt-2">
                  <p>Salas livres no mesmo horário (toque para escolher):</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {alternativas.map((s) => (
                      <button key={s.id} type="button" className="botao botao-secundario" onClick={() => mudar("sala", s.id)}>
                        <NomeSala sala={s} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p>Nenhuma outra sala está livre neste horário. Tente outro horário.</p>
              )}
            </Aviso>
          )}
          {pessoas > 0 && pessoas > sala.capacidade && (
            <Aviso tipo="aviso">Esta sala comporta até {sala.capacidade} pessoas.</Aviso>
          )}
        </div>
      )}

      <div>
        <label htmlFor="campo-atividade" className="rotulo">O que vai acontecer? (descrição da atividade)</label>
        <textarea {...attrs("atividade")} className="campo" rows={3} value={c.atividade} onChange={(e) => mudar("atividade", e.target.value)} />
        {erro("atividade")}
      </div>

      <div>
        <label htmlFor="campo-pessoas" className="rotulo">Quantas pessoas devem vir?</label>
        <input {...attrs("pessoas")} className="campo" type="number" inputMode="numeric" min={1} value={c.pessoas} onChange={(e) => mudar("pessoas", e.target.value)} />
        {erro("pessoas")}
      </div>

      <fieldset>
        <legend className="rotulo">É um encontro que se repete?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["nao", "sim"] as const).map((v) => (
            <label key={v} className={`botao ${c.recorrente === v ? "botao-primario" : "botao-secundario"}`}>
              <input type="radio" name="recorrente" className="sr-only" checked={c.recorrente === v} onChange={() => mudar("recorrente", v)} />
              {v === "sim" ? "Sim" : "Não"}
            </label>
          ))}
        </div>
      </fieldset>
      {c.recorrente === "sim" && (
        <div>
          <label htmlFor="campo-recorrencia" className="rotulo">Como se repete?</label>
          <input
            {...attrs("recorrencia")}
            className="campo"
            placeholder="Exemplo: toda 3ª terça-feira, até dezembro"
            value={c.recorrencia}
            onChange={(e) => mudar("recorrencia", e.target.value)}
          />
          <p className="mt-1">Este pedido é para a primeira data. A secretaria combina as próximas com você.</p>
          {erro("recorrencia")}
        </div>
      )}

      <p className="cartao">Seus dados serão usados apenas pela secretaria para tratar este pedido.</p>

      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}

      <button type="submit" className="botao botao-primario w-full text-xl" disabled={enviando}>
        {enviando ? "Enviando..." : "Enviar o pedido"}
      </button>
    </form>
  );
}
