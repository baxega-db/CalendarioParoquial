"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone, type NomeIcone } from "./Icone";
import { TamanhoLetra } from "./TamanhoLetra";
import { sair } from "@/app/acoes-auth";
import type { Perfil } from "@/lib/tipos";

type Item = { href: string; texto: string; icone: NomeIcone; contador?: number };

type Props = {
  nomeParoquia: string;
  usuario: { nome: string; perfil: Perfil } | null;
  pendentes: number;
};

function montarItens({ usuario, pendentes }: Props) {
  const publicos: Item[] = [
    { href: "/", texto: "Ver a agenda", icone: "agenda" },
    { href: "/pedir", texto: "Pedir uma sala", icone: "mais" },
    { href: "/livres", texto: "Salas livres agora", icone: "porta" },
    { href: "/salas", texto: "Conhecer as salas", icone: "sala" },
  ];
  const equipe: Item[] = usuario
    ? [
        { href: "/painel", texto: "Pedidos pendentes", icone: "pedidos", contador: pendentes },
        { href: "/painel/reservas", texto: "Reservas", icone: "reservas" },
        { href: "/painel/historico", texto: "Histórico", icone: "relogio" },
      ]
    : [];
  const admin: Item[] =
    usuario?.perfil === "admin"
      ? [
          { href: "/admin/salas", texto: "Cadastro de salas", icone: "sala" },
          { href: "/admin/datas", texto: "Datas bloqueadas", icone: "agenda" },
          { href: "/admin/usuarios", texto: "Usuários", icone: "usuarios" },
          { href: "/admin/configuracoes", texto: "Configurações", icone: "config" },
        ]
      : [];
  return { publicos, equipe, admin };
}

function ativo(caminho: string, href: string) {
  if (href === "/") return caminho === "/";
  if (href === "/painel") return caminho === "/painel";
  return caminho === href || caminho.startsWith(`${href}/`);
}

function Contador({ valor }: { valor?: number }) {
  if (!valor) return null;
  return (
    <span className="ml-auto rounded-full bg-perigo px-2.5 py-0.5 font-bold text-white" aria-label={`${valor} pendentes`}>
      {valor}
    </span>
  );
}

function ListaLinks({ itens, caminho, aoClicar }: { itens: Item[]; caminho: string; aoClicar?: () => void }) {
  return (
    <ul className="space-y-1">
      {itens.map((item) => {
        const atual = ativo(caminho, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={aoClicar}
              aria-current={atual ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 font-semibold ${
                atual ? "bg-primaria text-white" : "text-texto hover:bg-black/5"
              }`}
            >
              <Icone nome={item.icone} />
              <span>{item.texto}</span>
              <Contador valor={item.contador} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Grupos({ props, caminho, aoClicar }: { props: Props; caminho: string; aoClicar?: () => void }) {
  const { publicos, equipe, admin } = montarItens(props);
  return (
    <nav aria-label="Menu principal" className="space-y-5">
      <ListaLinks itens={publicos} caminho={caminho} aoClicar={aoClicar} />
      {equipe.length > 0 && (
        <div>
          <p className="mb-1 px-3 font-bold text-suave">Secretaria</p>
          <ListaLinks itens={equipe} caminho={caminho} aoClicar={aoClicar} />
        </div>
      )}
      {admin.length > 0 && (
        <div>
          <p className="mb-1 px-3 font-bold text-suave">Administração</p>
          <ListaLinks itens={admin} caminho={caminho} aoClicar={aoClicar} />
        </div>
      )}
      <div className="border-t border-borda/40 pt-4">
        {props.usuario ? (
          <form action={sair}>
            <p className="mb-2 px-3">
              Conectado como <strong>{props.usuario.nome}</strong>
            </p>
            <button type="submit" className="botao botao-secundario w-full">
              <Icone nome="sair" /> Sair
            </button>
          </form>
        ) : (
          <Link href="/entrar" onClick={aoClicar} className="botao botao-secundario w-full">
            <Icone nome="entrar" /> Entrar (secretaria)
          </Link>
        )}
      </div>
    </nav>
  );
}

export function Navegacao(props: Props) {
  const caminho = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
  }, [menuAberto]);

  const barra: Item[] = [
    { href: "/", texto: "Agenda", icone: "agenda" },
    { href: "/pedir", texto: "Pedir sala", icone: "mais" },
    { href: "/livres", texto: "Livres agora", icone: "porta" },
  ];
  if (props.usuario) barra.push({ href: "/painel", texto: "Pedidos", icone: "pedidos", contador: props.pendentes });

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-borda/40 bg-superficie md:col-span-2">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-2">
          <Link href="/" className="mr-auto text-xl font-extrabold leading-tight text-primaria">
            {props.nomeParoquia}
            <span className="block text-base font-semibold text-suave">Agenda das salas</span>
          </Link>
          <TamanhoLetra />
          <button
            type="button"
            className="botao botao-secundario md:hidden"
            onClick={() => setMenuAberto(true)}
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
          >
            <Icone nome="menu" /> Menu
          </button>
        </div>
      </header>

      <aside className="hidden w-72 shrink-0 border-r border-borda/40 bg-superficie p-4 md:block">
        <div className="sticky top-24">
          <Grupos props={props} caminho={caminho} />
        </div>
      </aside>

      {menuAberto && (
        <div id="menu-celular" className="fixed inset-0 z-50 overflow-y-auto bg-superficie p-4 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xl font-extrabold">Menu</p>
            <button type="button" className="botao botao-secundario" onClick={() => setMenuAberto(false)}>
              <Icone nome="fechar" /> Fechar
            </button>
          </div>
          <Grupos props={props} caminho={caminho} aoClicar={() => setMenuAberto(false)} />
        </div>
      )}

      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-borda/60 bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ gridTemplateColumns: `repeat(${barra.length}, minmax(0, 1fr))` }}
      >
        {barra.map((item) => {
          const atual = ativo(caminho, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={atual ? "page" : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-center font-bold leading-tight ${
                atual ? "bg-primaria text-white" : "text-texto"
              }`}
            >
              <Icone nome={item.icone} tamanho={26} />
              <span>{item.texto}</span>
              {!!item.contador && (
                <span className="absolute right-2 top-1 rounded-full bg-perigo px-2 font-bold text-white">{item.contador}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
