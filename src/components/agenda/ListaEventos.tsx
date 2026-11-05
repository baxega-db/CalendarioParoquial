import { estiloEvento, horario, NomeSala, SeloPendente, type EventoComSala } from "./comum";

export function ListaEventos({
  eventos,
  aoAbrir,
  vazio = "Nenhuma atividade marcada para este dia.",
}: {
  eventos: EventoComSala[];
  aoAbrir: (e: EventoComSala) => void;
  vazio?: string;
}) {
  if (eventos.length === 0) return <p className="cartao text-suave">{vazio}</p>;
  return (
    <ul className="space-y-3">
      {eventos.map((ev) => {
        const pendente = ev.situacao === "pendente";
        return (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => aoAbrir(ev)}
              className={`block w-full rounded-xl border-2 border-l-[10px] border-transparent p-3 text-left hover:shadow-md ${
                pendente ? "evento-pendente" : ""
              }`}
              style={estiloEvento(ev.sala.cor, pendente)}
            >
              <span className="block text-xl font-extrabold">{horario(ev)}</span>
              <span className="block">
                <NomeSala sala={ev.sala} />
              </span>
              <span className="block font-semibold">{ev.pastoral}</span>
              <span className="block">{ev.atividade}</span>
              {pendente && (
                <span className="mt-1 block">
                  <SeloPendente />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
