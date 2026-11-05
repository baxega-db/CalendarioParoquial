import { exigirAdmin, listarBloqueadas } from "@/lib/dados";
import { formatarDataLonga, hojeISO, somarMeses } from "@/lib/tempo";
import { BotaoLiberar, FormBloquear } from "./Formularios";

export const metadata = { title: "Datas bloqueadas" };

export default async function PaginaDatas() {
  await exigirAdmin();
  const hoje = hojeISO();
  const datas = await listarBloqueadas(hoje, somarMeses(hoje, 24));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="titulo-pagina">Datas bloqueadas</h1>
      <p>
        Feriados e períodos litúrgicos. Aparecem na agenda e são pulados ao criar reservas que se repetem (a secretaria
        pode desmarcar essa opção).
      </p>
      <FormBloquear hoje={hoje} />
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold">Próximas datas bloqueadas ({datas.length})</h2>
        {datas.length === 0 && <p className="cartao">Nenhuma data bloqueada.</p>}
        <ul className="space-y-2">
          {datas.map((d) => (
            <li key={d.id} className="cartao flex flex-wrap items-center gap-3">
              <div className="mr-auto">
                <p className="font-bold first-letter:uppercase">{formatarDataLonga(d.data, true)}</p>
                <p>{d.descricao}</p>
              </div>
              <BotaoLiberar id={d.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
