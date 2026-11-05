import { Icone } from "./Icone";

const ESTILOS = {
  sucesso: "bg-sucesso-fundo text-sucesso border-sucesso",
  aviso: "bg-aviso-fundo text-aviso border-aviso",
  erro: "bg-perigo-fundo text-perigo border-perigo",
  info: "bg-blue-50 text-primaria-escura border-primaria",
} as const;

export function Aviso({ tipo, children }: { tipo: keyof typeof ESTILOS; children: React.ReactNode }) {
  return (
    <div
      role={tipo === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border-2 p-3 font-semibold ${ESTILOS[tipo]}`}
    >
      <Icone nome={tipo === "sucesso" ? "check" : "alerta"} />
      <div>{children}</div>
    </div>
  );
}
