import { listarSalas, obterConfig } from "@/lib/dados";
import { hojeISO } from "@/lib/tempo";
import { FormPedido } from "./FormPedido";

export const metadata = { title: "Pedir uma sala" };

export default async function PaginaPedir({ searchParams }: { searchParams: Promise<{ sala?: string }> }) {
  const [{ sala }, salas, config] = await Promise.all([searchParams, listarSalas(), obterConfig()]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">Pedir uma sala</h1>
      <p>Preencha os campos abaixo. O pedido fica registrado e a secretaria responde pelo WhatsApp.</p>
      <FormPedido salas={salas} hoje={hojeISO()} salaInicial={sala ?? ""} whatsappSecretaria={config.whatsapp_secretaria} />
    </div>
  );
}
