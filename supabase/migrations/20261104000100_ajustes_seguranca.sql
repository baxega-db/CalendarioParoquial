-- Ajustes apontados pelo verificador de segurança do Supabase.

-- 1) A agenda pública passa a respeitar as permissões de quem consulta.
--    O visitante só pode ler as colunas públicas de reservas (nunca nome ou
--    telefone) e só de pedidos pendentes ou confirmados.
alter view public.agenda_publica set (security_invoker = true);

revoke all on table public.reservas from anon;
grant select (id, sala_id, inicio, fim, pastoral, atividade, pessoas, situacao) on table public.reservas to anon;

create policy "visitante vê agenda" on public.reservas
  for select to anon using (situacao in ('pendente', 'confirmada'));

-- 2) Funções internas não podem ser chamadas por visitantes.
revoke execute on function public.eh_equipe() from public, anon;
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.limpar_dados_pessoais(date) from public, anon;
-- Funções de gatilho não precisam ser chamadas por ninguém diretamente.
revoke execute on function public.registrar_historico() from public, anon, authenticated;
revoke execute on function public.tocar_atualizado_em() from public, anon, authenticated;
