"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/Aviso";
import { BUCKET_FOTOS, urlFoto } from "@/lib/fotos";
import { criarClienteNavegador } from "@/lib/supabase/cliente";
import type { FotoSala } from "@/lib/tipos";

const LADO_MAXIMO = 1600;

// Reduz a foto no próprio aparelho antes de enviar (economiza o armazenamento gratuito).
async function reduzir(arquivo: File): Promise<Blob> {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagem.width * escala);
  canvas.height = Math.round(imagem.height * escala);
  canvas.getContext("2d")!.drawImage(imagem, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("falha"))), "image/jpeg", 0.82));
}

export function FotosSala({ salaId, fotos }: { salaId: string; fotos: FotoSala[] }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setErro("");
    setEnviando(true);
    const supabase = criarClienteNavegador();
    let ordem = fotos.length ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    try {
      for (const arquivo of Array.from(arquivos)) {
        const blob = await reduzir(arquivo);
        const caminho = `${salaId}/${crypto.randomUUID()}.jpg`;
        const { error: e1 } = await supabase.storage.from(BUCKET_FOTOS).upload(caminho, blob, { contentType: "image/jpeg" });
        if (e1) throw e1;
        const { error: e2 } = await supabase.from("fotos_sala").insert({ sala_id: salaId, caminho, ordem: ordem++ });
        if (e2) throw e2;
      }
    } catch {
      setErro("Não foi possível enviar a foto. Tente outra imagem (JPG ou PNG).");
    }
    setEnviando(false);
    router.refresh();
  }

  async function apagar(foto: FotoSala) {
    if (!confirm("Apagar esta foto?")) return;
    const supabase = criarClienteNavegador();
    await supabase.storage.from(BUCKET_FOTOS).remove([foto.caminho]);
    await supabase.from("fotos_sala").delete().eq("id", foto.id);
    router.refresh();
  }

  async function principal(foto: FotoSala) {
    const supabase = criarClienteNavegador();
    const menor = Math.min(...fotos.map((f) => f.ordem));
    await supabase.from("fotos_sala").update({ ordem: menor - 1 }).eq("id", foto.id);
    router.refresh();
  }

  return (
    <section className="cartao space-y-3">
      <h2 className="text-xl font-extrabold">Fotos</h2>
      {fotos.length === 0 && <p>Nenhuma foto ainda. A primeira foto aparece na agenda e no pedido.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fotos.map((f, i) => (
          <figure key={f.id} className="space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlFoto(f.caminho)} alt="" className="aspect-video w-full rounded-xl object-cover" />
            <figcaption className="flex flex-wrap gap-2">
              {i === 0 ? (
                <span className="font-bold">Foto principal</span>
              ) : (
                <button type="button" className="botao botao-secundario" onClick={() => principal(f)}>
                  Usar como principal
                </button>
              )}
              <button type="button" className="botao botao-perigo" onClick={() => apagar(f)}>
                Apagar
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      <label className={`botao botao-primario w-full ${enviando ? "opacity-60" : ""}`}>
        <input type="file" accept="image/*" multiple className="sr-only" disabled={enviando} onChange={(e) => enviar(e.target.files)} />
        {enviando ? "Enviando..." : "Adicionar fotos"}
      </label>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
    </section>
  );
}
