import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navegacao } from "@/components/Navegacao";
import { scriptEscala } from "@/components/TamanhoLetra";
import { contarPendentes, obterConfig, obterUsuario } from "@/lib/dados";

export async function generateMetadata(): Promise<Metadata> {
  const config = await obterConfig();
  return {
    title: { default: `Agenda das salas — ${config.nome_paroquia}`, template: `%s — ${config.nome_paroquia}` },
    description: "Veja a agenda das salas da paróquia e peça uma sala.",
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1e3a8a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [config, usuario] = await Promise.all([obterConfig(), obterUsuario()]);
  const pendentes = usuario ? await contarPendentes() : 0;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptEscala }} />
      </head>
      <body className="min-h-dvh">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-3">
          Pular para o conteúdo
        </a>
        <div className="md:grid md:grid-cols-[18rem_1fr] md:grid-rows-[auto_1fr]">
          <Navegacao
            nomeParoquia={config.nome_paroquia}
            usuario={usuario ? { nome: usuario.nome, perfil: usuario.perfil } : null}
            pendentes={pendentes}
          />
          <main id="conteudo" className="min-w-0 px-4 pb-28 pt-4 md:px-8 md:pb-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
