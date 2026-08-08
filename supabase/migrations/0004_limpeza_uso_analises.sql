-- Limpeza periódica de contadores antigos da tabela `uso_analises`.
--
-- A tabela cresce ~1 linha por (sessão | IP | global) por dia. Sem limpeza,
-- linhas antigas se acumulam indefinidamente. Aqui criamos:
--   1. um índice para o filtro por data (a PK é `chave`, não cobre `atualizado_em`);
--   2. uma função `limpar_uso_antigo()` reutilizável (também executável à mão);
--   3. um agendamento diário com pg_cron, quando disponível no plano.

-- 1) Índice que acelera o DELETE por data.
create index if not exists uso_analises_atualizado_em_idx
  on public.uso_analises (atualizado_em);

-- 2) Função de limpeza: apaga contadores com mais de `p_dias` dias (padrão 8)
--    e retorna quantas linhas foram removidas.
create or replace function public.limpar_uso_antigo(p_dias integer default 8)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_removidas integer;
begin
  delete from public.uso_analises
  where atualizado_em < now() - make_interval(days => p_dias);
  get diagnostics v_removidas = row_count;
  return v_removidas;
end;
$$;

-- Somente o back-end (service_role) pode executar a limpeza.
revoke execute on function public.limpar_uso_antigo(integer) from public, anon, authenticated;
grant execute on function public.limpar_uso_antigo(integer) to service_role;

-- 3) Agendamento diário às 04:00 UTC (01:00 no horário de Brasília), fora do
--    pico de uso. Guarda por disponibilidade: se o pg_cron não puder ser
--    instalado no plano atual, a migração continua sem erro (índice e função
--    permanecem, e a limpeza pode ser feita manualmente via `limpar_uso_antigo`).
--    Obs.: o corpo do agendamento usa $cron$ (tag distinta de $$) para não
--    conflitar com o delimitador do bloco `do`.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    -- `unschedule` prévio mantém a migração idempotente.
    perform cron.unschedule(jobid)
      from cron.job
      where jobname = 'limpar-uso-antigo';
    perform cron.schedule(
      'limpar-uso-antigo',
      '0 4 * * *',
      $cron$select public.limpar_uso_antigo();$cron$
    );
  end if;
end $$;
