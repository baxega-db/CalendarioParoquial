import { exigirEquipe, listarSalas } from "@/lib/dados";
import { hojeISO } from "@/lib/tempo";
import { FormReserva } from "../FormReserva";

export const metadata = { title: "Nova reserva" };

export default async function PaginaNovaReserva() {
  await exigirEquipe();
  const salas = await listarSalas();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="titulo-pagina">Nova reserva</h1>
      <p>A reserva feita aqui já entra confirmada na agenda.</p>
      <FormReserva
        salas={salas}
        inicial={{
          periodo: { salaId: "", data: hojeISO(), inicio: "", fim: "" },
          pastoral: "",
          atividade: "",
          pessoas: 0,
          responsavel: "",
          telefone: "",
          buscarChave: false,
        }}
      />
    </div>
  );
}
