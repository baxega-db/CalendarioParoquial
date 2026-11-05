import { exigirAdmin } from "@/lib/dados";
import { criarClienteServidor } from "@/lib/supabase/server";
import { AcoesUsuario, FormNovoUsuario } from "./FormUsuarios";

export const metadata = { title: "Usuários" };

export default async function PaginaUsuarios() {
  const atual = await exigirAdmin();
  const supabase = await criarClienteServidor();
  const { data: usuarios } = await supabase.from("usuarios").select("id, nome, email, perfil").order("nome");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="titulo-pagina">Usuários</h1>
      <p>
        <strong>Secretaria</strong> aprova pedidos e cria reservas. <strong>Administrador</strong> também cadastra salas,
        usuários e muda as configurações.
      </p>
      <ul className="space-y-3">
        {(usuarios ?? []).map((u) => (
          <li key={u.id} className="cartao space-y-2">
            <p className="text-lg font-extrabold">
              {u.nome} {u.id === atual.id && "(você)"}
            </p>
            <p className="break-all">{u.email}</p>
            <p>Perfil: {u.perfil === "admin" ? "Administrador" : "Secretaria"}</p>
            {u.id !== atual.id && <AcoesUsuario id={u.id} nome={u.nome} perfil={u.perfil} />}
          </li>
        ))}
      </ul>
      <FormNovoUsuario />
    </div>
  );
}
