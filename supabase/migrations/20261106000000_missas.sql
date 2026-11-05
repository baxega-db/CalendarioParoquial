-- Horários de missa: padrão (repete toda semana ou todo mês) e avulsos
-- (missa adicional numa data, ou cancelamento de uma missa padrão numa data).
-- Leitura pública; secretaria e administrador cadastram.

create table public.missas_padrao (
  id uuid primary key default gen_random_uuid(),
  -- Mesmo formato de series.regra: dias_semana, mensal_posicao ou mensal_dia
  regra jsonb not null check (regra->>'tipo' in ('dias_semana', 'mensal_posicao', 'mensal_dia')),
  hora time not null,
  local text not null check (length(trim(local)) > 0),
  descricao text not null default '', -- ex.: "Missa das crianças"
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.missas_avulsas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('adicional', 'cancelada')),
  data date not null,
  hora time,
  local text,
  descricao text not null default '',
  missa_padrao_id uuid references public.missas_padrao (id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint adicional_completa check (
    tipo <> 'adicional' or (hora is not null and length(trim(coalesce(local, ''))) > 0)
  ),
  constraint cancelada_aponta_padrao check (tipo <> 'cancelada' or missa_padrao_id is not null)
);
create unique index missas_canceladas_unicas on public.missas_avulsas (missa_padrao_id, data) where tipo = 'cancelada';
create index missas_avulsas_data_idx on public.missas_avulsas (data);

alter table public.missas_padrao enable row level security;
alter table public.missas_avulsas enable row level security;

create policy "todos veem missas padrão" on public.missas_padrao
  for select to anon, authenticated using (true);
create policy "equipe cadastra missas padrão" on public.missas_padrao
  for insert to authenticated with check (public.eh_equipe());
create policy "equipe altera missas padrão" on public.missas_padrao
  for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "equipe remove missas padrão" on public.missas_padrao
  for delete to authenticated using (public.eh_equipe());

create policy "todos veem missas avulsas" on public.missas_avulsas
  for select to anon, authenticated using (true);
create policy "equipe cadastra missas avulsas" on public.missas_avulsas
  for insert to authenticated with check (public.eh_equipe());
create policy "equipe altera missas avulsas" on public.missas_avulsas
  for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());
create policy "equipe remove missas avulsas" on public.missas_avulsas
  for delete to authenticated using (public.eh_equipe());
