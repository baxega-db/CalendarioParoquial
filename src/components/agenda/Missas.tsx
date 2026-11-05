import type { Missa } from "@/lib/missas";
import { formatarHora } from "@/lib/tempo";

// Missas do dia, em destaque e separadas das reservas de sala.
export function MissasDoDia({ missas, titulo = "Missas" }: { missas: Missa[]; titulo?: string }) {
  if (missas.length === 0) return null;
  return (
    <section className="rounded-xl border-2 border-[#7c2d12] bg-[#fff7ed] p-3" aria-label={titulo}>
      <h3 className="mb-1 font-extrabold text-[#7c2d12]">{titulo}</h3>
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {missas.map((m) => (
          <li key={m.chave}>
            <strong className="text-lg">{formatarHora(m.hora)}</strong> — {m.local}
            {m.descricao && <span className="text-suave"> ({m.descricao})</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
