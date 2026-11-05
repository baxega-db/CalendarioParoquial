import { exigirAdmin, obterConfig } from "@/lib/dados";
import { hojeISO, somarMeses } from "@/lib/tempo";
import { FormConfiguracoes, FormLimpeza } from "./Formularios";

export const metadata = { title: "Configurações" };

export default async function PaginaConfiguracoes() {
  await exigirAdmin();
  const config = await obterConfig();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="titulo-pagina">Configurações</h1>
      <FormConfiguracoes config={config} />
      <FormLimpeza sugestao={somarMeses(hojeISO(), -6)} />
    </div>
  );
}
