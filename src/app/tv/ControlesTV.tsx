"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { FUSO } from "@/lib/tempo";

const ATUALIZAR_A_CADA_MS = 60_000;

const formatoRelogio = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

// Relógio, atualização automática da agenda e botão de tela cheia.
export function ControlesTV() {
  const router = useRouter();
  const [agora, setAgora] = useState<Date | null>(null);
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 1000);
    const atualizar = setInterval(() => router.refresh(), ATUALIZAR_A_CADA_MS);
    const aoMudarTela = () => setTelaCheia(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", aoMudarTela);

    // Pede para a tela não apagar enquanto a página estiver aberta (quando o navegador permite).
    let trava: { release: () => Promise<void> } | null = null;
    const pedirTrava = async () => {
      try {
        trava = (await (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof trava> } }).wakeLock?.request("screen")) ?? null;
      } catch {}
    };
    pedirTrava();
    const aoVoltar = () => document.visibilityState === "visible" && pedirTrava();
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      clearInterval(relogio);
      clearInterval(atualizar);
      document.removeEventListener("fullscreenchange", aoMudarTela);
      document.removeEventListener("visibilitychange", aoVoltar);
      trava?.release().catch(() => {});
    };
  }, [router]);

  return (
    <div className="flex items-center gap-[0.8em]">
      <span className="text-[2.6em] font-extrabold tabular-nums leading-none" aria-live="off">
        {agora ? formatoRelogio.format(agora) : ""}
      </span>
      {!telaCheia && (
        <button
          type="button"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="botao border-white bg-white/10 text-white hover:bg-white/20"
        >
          <Icone nome="telaCheia" /> Tela cheia
        </button>
      )}
    </div>
  );
}
