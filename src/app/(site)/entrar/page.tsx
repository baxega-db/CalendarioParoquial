import Link from "next/link";
import { FormEntrar } from "./FormEntrar";

export const metadata = { title: "Entrar" };

export default async function PaginaEntrar({ searchParams }: { searchParams: Promise<{ voltar?: string }> }) {
  const { voltar } = await searchParams;
  return (
    <div className="mx-auto max-w-md space-y-5">
      <h1 className="titulo-pagina">Entrar</h1>
      <p>Área da secretaria. Para ver a agenda ou pedir uma sala, não precisa entrar.</p>
      <FormEntrar voltar={voltar ?? ""} />
      <p>
        <Link href="/esqueci" className="font-bold text-primaria underline">
          Esqueci minha senha
        </Link>
      </p>
    </div>
  );
}
