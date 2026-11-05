"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/Aviso";
import type { Configuracoes } from "@/lib/tipos";
import { formatarTelefone } from "@/lib/whatsapp";
import { limparDadosPessoais, salvarConfiguracoes } from "../acoes";

export function FormConfiguracoes({ config }: { config: Configuracoes }) {
  const [estado, acao, salvando] = useActionState(salvarConfiguracoes, null);
  return (
    <form action={acao} className="cartao space-y-4">
      <div>
        <label htmlFor="nome" className="rotulo">Nome da paróquia</label>
        <input id="nome" name="nome" className="campo" required defaultValue={config.nome_paroquia} />
      </div>
      <div>
        <label htmlFor="whatsapp" className="rotulo">Número do WhatsApp da secretaria</label>
        <input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          className="campo"
          required
          defaultValue={`+55 ${formatarTelefone(config.whatsapp_secretaria)}`}
        />
        <p className="mt-1">Os pedidos de sala são enviados para este número.</p>
      </div>
      <fieldset>
        <legend className="rotulo">Horário de funcionamento (aparece na agenda)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="abertura" className="rotulo">Abre às</label>
            <input id="abertura" name="abertura" type="time" className="campo" required defaultValue={config.hora_abertura} />
          </div>
          <div>
            <label htmlFor="fechamento" className="rotulo">Fecha às</label>
            <input id="fechamento" name="fechamento" type="time" className="campo" required defaultValue={config.hora_fechamento} />
          </div>
        </div>
      </fieldset>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button type="submit" className="botao botao-primario w-full" disabled={salvando}>
        {salvando ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}

export function FormLimpeza({ sugestao }: { sugestao: string }) {
  const [estado, acao, salvando] = useActionState(limparDadosPessoais, null);
  return (
    <form action={acao} className="cartao space-y-4 border-2 border-perigo">
      <h2 className="text-xl font-extrabold">Limpar dados pessoais de pedidos antigos</h2>
      <p>
        Apaga o nome e o telefone de quem pediu, em pedidos não aprovados, cancelados ou que já aconteceram, com data
        anterior à escolhida. A reserva continua na agenda e no histórico. Não dá para desfazer.
      </p>
      <div>
        <label htmlFor="antes" className="rotulo">Pedidos com data anterior a</label>
        <input id="antes" name="antes" type="date" className="campo" required defaultValue={sugestao} />
      </div>
      <label className="flex min-h-12 items-center gap-3">
        <input type="checkbox" name="confirmo" value="sim" required className="h-6 w-6" />
        Confirmo que quero apagar esses dados
      </label>
      {estado?.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado?.ok && <Aviso tipo="sucesso">{estado.ok}</Aviso>}
      <button type="submit" className="botao botao-perigo w-full" disabled={salvando}>
        {salvando ? "Limpando..." : "Apagar dados pessoais"}
      </button>
    </form>
  );
}
