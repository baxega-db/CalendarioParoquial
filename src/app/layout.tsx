import type { Metadata, Viewport } from "next";
import "./globals.css";
import { scriptEscala } from "@/components/TamanhoLetra";
import { obterConfig } from "@/lib/dados";

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

// Só a moldura da página. O menu fica em (site)/layout.tsx; o modo TV não tem menu.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptEscala }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
