import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="titulo-pagina">Página não encontrada</h1>
      <p>O endereço pode estar errado ou a página saiu do ar.</p>
      <Link href="/" className="botao botao-primario w-full">
        Ver a agenda
      </Link>
    </div>
  );
}
