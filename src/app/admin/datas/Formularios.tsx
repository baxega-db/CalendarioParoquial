"use client";

import { useActionState, useState, useTransition } from "react";
import { Aviso } from "@/components/Aviso";
import { bloquearDatas, desbloquearData } from "../acoes";

export function FormBloquear({ hoje }: { hoje: string }) {
  const [estado, acao, salvando] = useActionState(bloquearDatas, null);
  const [periodo, setPeriodo] = useState(false);
  return (
    <form action={acao} className="cartao space-y-4">
      <h2 className="text-xl font-extrabold">Bloquear data</h2>
      <div className="grid grid-cols-2 gap-3">
        {[false, true].map((op) => (
          <label key={String(op)} className={`botao ${periodo === op ? "botao-primario" : "botao-secundario"}`}>
            <input type="radio" name="tipo" className="sr-only" checked={periodo === op} onChange={() => setPeriodo(op)} />
            {op ? "Um período" : "Um dia"}
          </label>
        ))}
      </div>
      <div>
        <label htmlFor="de" className="rotulo">{periodo ? "Primeiro dia" : "Dia"}</label>
        <input id="de" name="de" type="date" className="campo" required min={hoje} />
      </div>
      {periodo && (
        <div>
          <label htmlFor="ate" className="rotulo">Último dia</label>
          <input id="ate" name="ate" type="date" className="campo" required min={hoje} />
        </div>
      )}
      <div>
        <label htmlFor="descricao" className="rotulo">Motivo</label>
        <input id="descricao" name="descricao" className="campo" required placeholder="Exemplo: Semana Santa" />
      </div>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Salvando..." : "Bloquear"}
      </button>
    </form>
  );
}

export function BotaoLiberar({ id }: { id: string }) {
  const [salvando, iniciar] = useTransition();
  return (
    <button
      type="button"
      className="botao botao-perigo"
      disabled={salvando}
      onClick={() => confirm("Liberar esta data?") && iniciar(async () => void (await desbloquearData(id)))}
    >
      {salvando ? "Liberando..." : "Liberar"}
    </button>
  );
}
