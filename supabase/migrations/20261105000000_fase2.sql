-- Fase 2: datas bloqueadas, criação e edição de séries (recorrências).

-- ---------------------------------------------------------------------------
-- Datas bloqueadas (feriados, Semana Santa, Natal...)
-- ---------------------------------------------------------------------------
create table public.datas_bloqueadas (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  descricao text not null check (length(trim(descricao)) > 0),
  criado_em timestamptz not null default now()
);

alter table public.datas_bloqueadas enable row level security;

create policy "todos veem datas bloqueadas" on public.datas_bloqueadas
  for select to anon, authenticated using (true);
create policy "admin cadastra datas bloqueadas" on public.datas_bloqueadas
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera datas bloqueadas" on public.datas_bloqueadas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin remove datas bloqueadas" on public.datas_bloqueadas
  for delete to authenticated using (public.eh_admin());

-- Feriados nacionais e Tríduo Pascal até o fim de 2027 (o administrador pode
-- apagar ou acrescentar, inclusive os feriados da cidade).
insert into public.datas_bloqueadas (data, descricao) values
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Dia da Consciência Negra'),
  ('2026-12-24', 'Véspera de Natal'),
  ('2026-12-25', 'Natal'),
  ('2026-12-31', 'Véspera de Ano-Novo'),
  ('2027-01-01', 'Santa Maria, Mãe de Deus / Ano-Novo'),
  ('2027-03-25', 'Quinta-feira Santa'),
  ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-03-27', 'Sábado Santo'),
  ('2027-04-21', 'Tiradentes'),
  ('2027-05-01', 'Dia do Trabalho'),
  ('2027-05-27', 'Corpus Christi'),
  ('2027-09-07', 'Independência do Brasil'),
  ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),
  ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Dia da Consciência Negra'),
  ('2027-12-24', 'Véspera de Natal'),
  ('2027-12-25', 'Natal'),
  ('2027-12-31', 'Véspera de Ano-Novo')
on conflict (data) do nothing;

-- ---------------------------------------------------------------------------
-- Criar uma série: a série e todos os encontros entram juntos, ou nada entra
-- (se um encontro bater com outra reserva confirmada, nada é salvo).
-- Roda com as permissões de quem chama (RLS vale normalmente).
-- ---------------------------------------------------------------------------
create or replace function public.criar_serie(
  p_regra jsonb,
  p_data_inicio date,
  p_data_fim date,
  p_num_encontros integer,
  p_pastoral text,
  p_atividade text,
  p_pessoas integer,
  p_responsavel text,
  p_telefone text,
  p_encontros jsonb -- [{ "sala_id": uuid, "inicio": timestamptz, "fim": timestamptz, "buscar_chave": bool }]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_serie uuid;
  v_encontro jsonb;
begin
  if not public.eh_equipe() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if jsonb_typeof(p_encontros) <> 'array' or jsonb_array_length(p_encontros) = 0 then
    raise exception 'SEM_ENCONTROS';
  end if;
  if jsonb_array_length(p_encontros) > 400 then
    raise exception 'ENCONTROS_DEMAIS';
  end if;

  insert into public.series (regra, data_inicio, data_fim, num_encontros, criado_por)
  values (p_regra, p_data_inicio, p_data_fim, p_num_encontros, auth.uid())
  returning id into v_serie;

  for v_encontro in select * from jsonb_array_elements(p_encontros) loop
    insert into public.reservas (
      sala_id, inicio, fim, pastoral, atividade, pessoas, responsavel, telefone,
      situacao, buscar_chave, origem, serie_id, criado_por, decidido_por, decidido_em
    ) values (
      (v_encontro->>'sala_id')::uuid,
      (v_encontro->>'inicio')::timestamptz,
      (v_encontro->>'fim')::timestamptz,
      trim(p_pastoral), trim(p_atividade), greatest(coalesce(p_pessoas, 0), 0),
      nullif(trim(coalesce(p_responsavel, '')), ''), nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), ''),
      'confirmada', coalesce((v_encontro->>'buscar_chave')::boolean, false), 'secretaria', v_serie,
      auth.uid(), auth.uid(), now()
    );
  end loop;

  return v_serie;
end;
$$;

-- ---------------------------------------------------------------------------
-- Editar "este e os próximos" ou "todos" de uma série. Cada encontro mantém o
-- seu dia; muda sala, horário e os demais dados. Se algum encontro passar a
-- bater com outra reserva confirmada, nada é alterado.
-- ---------------------------------------------------------------------------
create or replace function public.editar_serie(
  p_reserva_id bigint,
  p_escopo text, -- 'proximos' ou 'todos'
  p_sala_id uuid,
  p_hora_inicio time,
  p_hora_fim time,
  p_pastoral text,
  p_atividade text,
  p_pessoas integer,
  p_responsavel text,
  p_telefone text,
  p_buscar_chave boolean
)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_ref public.reservas;
  v_total integer;
begin
  if not public.eh_equipe() then
    raise exception 'SEM_PERMISSAO';
  end if;
  if p_escopo not in ('proximos', 'todos') then
    raise exception 'ESCOPO_INVALIDO';
  end if;
  if p_hora_fim <= p_hora_inicio then
    raise exception 'HORARIO_INVALIDO';
  end if;

  select * into v_ref from public.reservas where id = p_reserva_id;
  if not found or v_ref.serie_id is null then
    raise exception 'SEM_SERIE';
  end if;

  update public.reservas r
     set sala_id = p_sala_id,
         inicio = ((r.inicio at time zone 'America/Sao_Paulo')::date + p_hora_inicio) at time zone 'America/Sao_Paulo',
         fim = ((r.inicio at time zone 'America/Sao_Paulo')::date + p_hora_fim) at time zone 'America/Sao_Paulo',
         pastoral = trim(p_pastoral),
         atividade = trim(p_atividade),
         pessoas = greatest(coalesce(p_pessoas, 0), 0),
         responsavel = nullif(trim(coalesce(p_responsavel, '')), ''),
         telefone = nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g'), ''),
         buscar_chave = p_buscar_chave
   where r.serie_id = v_ref.serie_id
     and r.situacao = 'confirmada'
     and (p_escopo = 'todos' or r.inicio >= v_ref.inicio);

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- Cancelar "só este", "este e os próximos" ou "todos".
create or replace function public.cancelar_reservas(p_reserva_id bigint, p_escopo text)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  v_ref public.reservas;
  v_total integer;
begin
  if not public.eh_equipe() then
    raise exception 'SEM_PERMISSAO';
  end if;
  select * into v_ref from public.reservas where id = p_reserva_id;
  if not found then
    raise exception 'NAO_ENCONTRADA';
  end if;
  if p_escopo <> 'este' and v_ref.serie_id is null then
    raise exception 'SEM_SERIE';
  end if;

  update public.reservas r
     set situacao = 'cancelada'
   where r.situacao = 'confirmada'
     and case p_escopo
           when 'este' then r.id = v_ref.id
           when 'proximos' then r.serie_id = v_ref.serie_id and r.inicio >= v_ref.inicio
           when 'todos' then r.serie_id = v_ref.serie_id
           else false
         end;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.criar_serie(jsonb, date, date, integer, text, text, integer, text, text, jsonb) from public, anon;
revoke execute on function public.editar_serie(bigint, text, uuid, time, time, text, text, integer, text, text, boolean) from public, anon;
revoke execute on function public.cancelar_reservas(bigint, text) from public, anon;
grant execute on function public.criar_serie(jsonb, date, date, integer, text, text, integer, text, text, jsonb) to authenticated;
grant execute on function public.editar_serie(bigint, text, uuid, time, time, text, text, integer, text, text, boolean) to authenticated;
grant execute on function public.cancelar_reservas(bigint, text) to authenticated;
