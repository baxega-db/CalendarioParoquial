import { Navegacao } from "@/components/Navegacao";
import { contarPendentes, obterConfig, obterUsuario } from "@/lib/dados";

export default async function LayoutSite({ children }: { children: React.ReactNode }) {
  const [config, usuario] = await Promise.all([obterConfig(), obterUsuario()]);
  const pendentes = usuario ? await contarPendentes() : 0;

  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-3">
        Pular para o conteúdo
      </a>
      <div className="md:grid md:grid-cols-[18rem_1fr] md:grid-rows-[auto_1fr] print:block">
        <Navegacao
          nomeParoquia={config.nome_paroquia}
          usuario={usuario ? { nome: usuario.nome, perfil: usuario.perfil } : null}
          pendentes={pendentes}
        />
        <main id="conteudo" className="min-w-0 px-4 pb-28 pt-4 md:px-8 md:pb-10 print:p-0">
          {children}
        </main>
      </div>
    </>
  );
}
