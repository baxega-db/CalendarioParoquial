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

  // Diminui a letra aos poucos até tudo caber na tela, sem passar de 25% menor.
  useEffect(() => {
    const tela = document.getElementById("tela-tv");
    if (!tela) return;
    let quadro = 0;
    const ajustar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        let escala = 1;
        tela.style.setProperty("--ajuste-tv", "1");
        while (document.documentElement.scrollHeight > window.innerHeight + 1 && escala > 0.75) {
          escala = Math.round((escala - 0.03) * 100) / 100;
          tela.style.setProperty("--ajuste-tv", String(escala));
        }
      });
    };
    ajustar();
    const observador = new MutationObserver(ajustar);
    observador.observe(tela, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", ajustar);
    return () => {
      cancelAnimationFrame(quadro);
      observador.disconnect();
      window.removeEventListener("resize", ajustar);
    };
  }, []);

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
