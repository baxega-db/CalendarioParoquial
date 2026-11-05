"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/Aviso";
import { PALETA, RECURSOS, type Sala } from "@/lib/tipos";
import { salvarSala } from "../acoes";

function SimNao({ nome, rotulo, padrao }: { nome: string; rotulo: string; padrao: boolean }) {
  const [valor, setValor] = useState(padrao);
  return (
    <fieldset>
      <legend className="rotulo">{rotulo}</legend>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((v) => (
          <label key={String(v)} className={`botao ${valor === v ? "botao-primario" : "botao-secundario"}`}>
            <input type="radio" name={nome} value={v ? "sim" : "nao"} className="sr-only" checked={valor === v} onChange={() => setValor(v)} />
            {v ? "Sim" : "Não"}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FormSala({ sala, coresUsadas }: { sala?: Sala; coresUsadas: string[] }) {
  const [estado, acao, salvando] = useActionState(salvarSala, null);
  const livre = PALETA.find((p) => !coresUsadas.includes(p.cor))?.cor ?? PALETA[0].cor;
  const [cor, setCor] = useState(sala?.cor ?? livre);

  return (
    <form action={acao} className="cartao space-y-4">
      {sala && <input type="hidden" name="id" value={sala.id} />}
      <div>
        <label htmlFor="nome" className="rotulo">Nome da sala</label>
        <input id="nome" name="nome" className="campo" required defaultValue={sala?.nome} />
      </div>

      <fieldset>
        <legend className="rotulo">Cor na agenda</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PALETA.map((p) => {
            const usada = coresUsadas.includes(p.cor) && p.cor !== sala?.cor;
            return (
              <label
                key={p.cor}
                className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border-4 px-2 font-semibold ${
                  cor === p.cor ? "border-texto" : "border-transparent"
                }`}
              >
                <input type="radio" name="cor" value={p.cor} checked={cor === p.cor} onChange={() => setCor(p.cor)} className="sr-only" />
                <span className="h-8 w-8 shrink-0 rounded-lg" style={{ background: p.cor }} aria-hidden="true" />
                <span>
                  {p.nome}
                  {usada && <span className="block font-normal text-suave">já usada</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="capacidade" className="rotulo">Capacidade (número de pessoas)</label>
        <input id="capacidade" name="capacidade" type="number" min={0} className="campo" required defaultValue={sala?.capacidade ?? ""} />
      </div>
      <div>
        <label htmlFor="localizacao" className="rotulo">Onde fica (andar, prédio, referência)</label>
        <input id="localizacao" name="localizacao" className="campo" defaultValue={sala?.localizacao} />
      </div>

      <fieldset>
        <legend className="rotulo">O que tem na sala</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {RECURSOS.map((r) => (
            <label key={r} className="flex min-h-12 items-center gap-3 rounded-xl border border-borda/50 px-3">
              <input type="checkbox" name="recursos" value={r} defaultChecked={sala?.recursos.includes(r)} className="h-6 w-6" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <SimNao nome="precisa_chave" rotulo="Precisa buscar a chave na secretaria?" padrao={sala?.precisa_chave ?? false} />

      <div>
        <label htmlFor="observacoes" className="rotulo">Observações</label>
        <textarea id="observacoes" name="observacoes" rows={3} className="campo" defaultValue={sala?.observacoes} />
      </div>

      <SimNao nome="ativa" rotulo="Sala em uso? (Não = em reforma ou desativada)" padrao={sala?.ativa ?? true} />

      <div>
        <label htmlFor="ordem" className="rotulo">Ordem na lista (menor aparece primeiro)</label>
        <input id="ordem" name="ordem" type="number" className="campo" defaultValue={sala?.ordem ?? 0} />
      </div>

      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Salvando..." : sala ? "Salvar a sala" : "Cadastrar e adicionar fotos"}
      </button>
    </form>
  );
}
