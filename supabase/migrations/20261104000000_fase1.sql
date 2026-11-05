-- Fase 1 do Agendador de Salas da Paróquia
-- Tabelas, regras de acesso (RLS), restrição contra reservas sobrepostas,
-- visão pública da agenda (sem dados pessoais) e funções para visitantes.

create extension if not exists btree_gist with schema extensions;

create type public.perfil_usuario as enum ('editor', 'admin');
create type public.situacao_reserva as enum ('pendente', 'confirmada', 'recusada', 'cancelada');

-- ---------------------------------------------------------------------------
-- Usuários com login (secretaria/editor e administrador)
-- ---------------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil public.perfil_usuario not null default 'editor',
  criado_em timestamptz not null default now()
);

create or replace function public.eh_equipe()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.usuarios where id = auth.uid());
$$;

create or replace function public.eh_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.usuarios where id = auth.uid() and perfil = 'admin');
$$;

alter table public.usuarios enable row level security;

create policy "equipe vê usuários" on public.usuarios
  for select to authenticated using (public.eh_equipe());
create policy "admin cadastra usuários" on public.usuarios
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera usuários" on public.usuarios
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin remove usuários" on public.usuarios
  for delete to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------------------
-- Salas e fotos (ficha pública)
-- ---------------------------------------------------------------------------
create table public.salas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  cor text not null check (cor ~ '^#[0-9a-fA-F]{6}$'),
  capacidade integer not null default 0 check (capacidade >= 0),
  localizacao text not null default '',
  recursos text[] not null default '{}',
  precisa_chave boolean not null default false,
  observacoes text not null default '',
  ativa boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);

create table public.fotos_sala (
  id uuid primary key default gen_random_uuid(),
  sala_id uuid not null references public.salas (id) on delete cascade,
  caminho text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now()
);
create index fotos_sala_sala_idx on public.fotos_sala (sala_id, ordem);

alter table public.salas enable row level security;
alter table public.fotos_sala enable row level security;

create policy "todos veem salas" on public.salas
  for select to anon, authenticated using (true);
create policy "admin cadastra salas" on public.salas
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera salas" on public.salas
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
-- Sem política de exclusão: sala sai de uso marcando "inativa", sem apagar histórico.

create policy "todos veem fotos" on public.fotos_sala
  for select to anon, authenticated using (true);
create policy "admin cadastra fotos" on public.fotos_sala
  for insert to authenticated with check (public.eh_admin());
create policy "admin altera fotos" on public.fotos_sala
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy "admin remove fotos" on public.fotos_sala
  for delete to authenticated using (public.eh_admin());

-- ---------------------------------------------------------------------------
-- Séries de recorrência (usadas na Fase 2; a tabela já existe para as reservas apontarem)
-- ---------------------------------------------------------------------------
create table public.series (
  id uuid primary key default gen_random_uuid(),
  regra jsonb not null,
  data_inicio date not null,
  data_fim date,
  num_encontros integer check (num_encontros is null or num_encontros > 0),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now()
);

alter table public.series enable row level security;

create policy "equipe vê séries" on public.series
  for select to authenticated using (public.eh_equipe());
create policy "equipe cria séries" on public.series
  for insert to authenticated with check (public.eh_equipe());
create policy "equipe altera séries" on public.series
  for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

-- ---------------------------------------------------------------------------
-- Reservas e solicitações (cada encontro é uma linha)
-- ---------------------------------------------------------------------------
create table public.reservas (
  id bigint generated always as identity primary key, -- é o "Pedido nº"
  sala_id uuid not null references public.salas (id),
  inicio timestamptz not null,
  fim timestamptz not null,
  pastoral text not null,
  atividade text not null,
  pessoas integer not null default 0 check (pessoas >= 0),
  responsavel text,          -- dado pessoal: pode ser apagado na limpeza
  telefone text,             -- dado pessoal: pode ser apagado na limpeza
  recorrencia_pedida text,   -- "É recorrente?" informado por quem pediu (texto livre)
  situacao public.situacao_reserva not null default 'pendente',
  buscar_chave boolean not null default false,
  motivo_recusa text,
  serie_id uuid references public.series (id) on delete set null,
  origem text not null default 'solicitacao' check (origem in ('solicitacao', 'secretaria')),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  decidido_em timestamptz,
  decidido_por uuid references auth.users (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  dados_limpos_em timestamptz,
  constraint fim_depois_do_inicio check (fim > inicio),
  -- Impede duas reservas CONFIRMADAS sobrepostas na mesma sala, mesmo com
  -- duas pessoas aprovando ao mesmo tempo.
  constraint sem_sobreposicao exclude using gist (
    sala_id with =,
    tstzrange(inicio, fim, '[)') with &&
  ) where (situacao = 'confirmada')
);
create index reservas_periodo_idx on public.reservas (inicio, fim);
create index reservas_pendentes_idx on public.reservas (criado_em) where situacao = 'pendente';

alter table public.reservas enable row level security;

-- Visitantes não leem a tabela: usam a visão agenda_publica e a função solicitar_sala.
create policy "equipe vê reservas" on public.reservas
  for select to authenticated using (public.eh_equipe());
create policy "equipe cria reservas" on public.reservas
  for insert to authenticated with check (public.eh_equipe());
create policy "equipe altera reservas" on public.reservas
  for update to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger reservas_atualizado_em
  before update on public.reservas
  for each row execute function public.tocar_atualizado_em();

-- Agenda pública: só sala, horário, pastoral, atividade e situação.
-- Nome e telefone do solicitante nunca aparecem aqui.
create view public.agenda_publica as
  select id, sala_id, inicio, fim, pastoral, atividade, pessoas, situacao
  from public.reservas
  where situacao in ('pendente', 'confirmada');

grant select on public.agenda_publica to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Histórico de quem criou, aprovou ou alterou
-- ---------------------------------------------------------------------------
create table public.historico (
  id bigint generated always as identity primary key,
  reserva_id bigint references public.reservas (id) on delete cascade,
  acao text not null,
  usuario_id uuid references auth.users (id) on delete set null,
  detalhes jsonb not null default '{}',
  em timestamptz not null default now()
);
create index historico_reserva_idx on public.historico (reserva_id, em);

alter table public.historico enable row level security;

create policy "equipe vê histórico" on public.historico
  for select to authenticated using (public.eh_equipe());
-- Escrita só pelas funções abaixo (security definer).

create or replace function public.registrar_historico()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_acao text;
begin
  if tg_op = 'INSERT' then
    v_acao := case when new.origem = 'solicitacao' then 'pedido_recebido' else 'reserva_criada' end;
  elsif new.situacao is distinct from old.situacao then
    v_acao := case new.situacao
      when 'confirmada' then 'confirmada'
      when 'recusada' then 'nao_aprovada'
      when 'cancelada' then 'cancelada'
      else 'situacao_alterada'
    end;
  elsif new.dados_limpos_em is distinct from old.dados_limpos_em then
    v_acao := 'dados_pessoais_apagados';
  else
    v_acao := 'alterada';
  end if;

  insert into public.historico (reserva_id, acao, usuario_id, detalhes)
  values (
    new.id,
    v_acao,
    auth.uid(),
    case when tg_op = 'UPDATE' then jsonb_build_object(
      'sala_antes', old.sala_id, 'sala_depois', new.sala_id,
      'inicio_antes', old.inicio, 'inicio_depois', new.inicio,
      'fim_antes', old.fim, 'fim_depois', new.fim
    ) else '{}'::jsonb end
  );
  return new;
end;
$$;

create trigger reservas_historico
  after insert or update on public.reservas
  for each row execute function public.registrar_historico();

-- ---------------------------------------------------------------------------
-- Configurações (linha única)
-- ---------------------------------------------------------------------------
create table public.configuracoes (
  id integer primary key default 1 check (id = 1),
  nome_paroquia text not null default 'Paróquia',
  whatsapp_secretaria text not null default '551934212290' check (whatsapp_secretaria ~ '^[0-9]{10,15}$'),
  hora_abertura time not null default '07:00',
  hora_fechamento time not null default '22:00',
  atualizado_em timestamptz not null default now(),
  constraint horario_valido check (hora_fechamento > hora_abertura)
);

insert into public.configuracoes (id) values (1);

alter table public.configuracoes enable row level security;

create policy "todos veem configurações" on public.configuracoes
  for select to anon, authenticated using (true);
create policy "admin altera configurações" on public.configuracoes
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------------
-- Funções para o público
-- ---------------------------------------------------------------------------

-- Pedido de sala feito por qualquer pessoa, sem login. Sempre entra como pendente.
create or replace function public.solicitar_sala(
  p_sala_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz,
  p_pastoral text,
  p_atividade text,
  p_pessoas integer,
  p_responsavel text,
  p_telefone text,
  p_recorrencia text default null
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  v_sala public.salas;
  v_id bigint;
  v_telefone text := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
begin
  if length(trim(coalesce(p_responsavel, ''))) = 0 or length(p_responsavel) > 120 then
    raise exception 'NOME_INVALIDO';
  end if;
  if length(v_telefone) < 10 or length(v_telefone) > 13 then
    raise exception 'TELEFONE_INVALIDO';
  end if;
  if length(trim(coalesce(p_pastoral, ''))) = 0 or length(p_pastoral) > 120 then
    raise exception 'PASTORAL_INVALIDA';
  end if;
  if length(trim(coalesce(p_atividade, ''))) = 0 or length(p_atividade) > 500 then
    raise exception 'ATIVIDADE_INVALIDA';
  end if;
  if p_pessoas is null or p_pessoas < 1 or p_pessoas > 2000 then
    raise exception 'PESSOAS_INVALIDO';
  end if;
  if p_fim <= p_inicio or p_fim - p_inicio > interval '16 hours' then
    raise exception 'HORARIO_INVALIDO';
  end if;
  if p_inicio < now() then
    raise exception 'DATA_PASSADA';
  end if;
  if length(coalesce(p_recorrencia, '')) > 300 then
    raise exception 'RECORRENCIA_INVALIDA';
  end if;

  select * into v_sala from public.salas where id = p_sala_id and ativa;
  if not found then
    raise exception 'SALA_INVALIDA';
  end if;

  if exists (
    select 1 from public.reservas
    where sala_id = p_sala_id and situacao = 'confirmada'
      and tstzrange(inicio, fim, '[)') && tstzrange(p_inicio, p_fim, '[)')
  ) then
    raise exception 'SALA_OCUPADA';
  end if;

  insert into public.reservas (
    sala_id, inicio, fim, pastoral, atividade, pessoas, responsavel, telefone,
    recorrencia_pedida, situacao, buscar_chave, origem
  ) values (
    p_sala_id, p_inicio, p_fim, trim(p_pastoral), trim(p_atividade), p_pessoas,
    trim(p_responsavel), v_telefone, nullif(trim(coalesce(p_recorrencia, '')), ''),
    'pendente', v_sala.precisa_chave, 'solicitacao'
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.solicitar_sala(uuid, timestamptz, timestamptz, text, text, integer, text, text, text) from public;
grant execute on function public.solicitar_sala(uuid, timestamptz, timestamptz, text, text, integer, text, text, text) to anon, authenticated;

-- Limpeza de dados pessoais: somente administrador. Apaga nome e telefone de
-- pedidos recusados/cancelados ou já passados, anteriores à data escolhida.
create or replace function public.limpar_dados_pessoais(p_antes_de date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_total integer;
begin
  if not public.eh_admin() then
    raise exception 'SEM_PERMISSAO';
  end if;

  update public.reservas
     set responsavel = null, telefone = null, dados_limpos_em = now()
   where dados_limpos_em is null
     and inicio < (p_antes_de::timestamp at time zone 'America/Sao_Paulo')
     and (situacao in ('recusada', 'cancelada') or fim < now());

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.limpar_dados_pessoais(date) from public;
grant execute on function public.limpar_dados_pessoais(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: fotos das salas (leitura pública, envio só pelo administrador)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-salas', 'fotos-salas', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin envia fotos de salas" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos-salas' and public.eh_admin());
create policy "admin altera fotos de salas" on storage.objects
  for update to authenticated using (bucket_id = 'fotos-salas' and public.eh_admin());
create policy "admin apaga fotos de salas" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos-salas' and public.eh_admin());
