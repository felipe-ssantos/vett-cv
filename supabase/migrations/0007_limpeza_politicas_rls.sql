-- Hardening RLS pós-revisão de segurança: remove políticas permissivas criadas
-- via dashboard (bypass de RLS) e fixa o search_path da função do contador.
--
-- Contexto (Supabase Security Advisor):
--   - `rls_policy_always_true`:
--       "Permitir exclusao de analises" (DELETE USING true) — qualquer
--       visitante anônimo podia APAGAR análises de qualquer usuário (IDOR
--       que burlava o isolamento por sessão);
--       "Permitir insercao de analises" (INSERT WITH CHECK true) — qualquer
--       um podia inserir linhas com user_id arbitrário (mass assignment).
--   - "Permitir leitura de analises" também foi criada manualmente no
--     dashboard e liberava leitura além da própria sessão (potencial vazamento
--     de dados de outros usuários).
--   - As policies CORRETAS foram criadas na migration 0002
--     (`analises_select_propria`, `analises_insert_propria`,
--     `analises_delete_propria` — user_id = auth.uid()) e cobrem todo o
--     fluxo do app (lista, detalhe, salvar e excluir), por isso as três do
--     dashboard podem ser removidas sem risco.
--   - `function_search_path_mutable`: `incrementar_uso` (0001) não fixava o
--     search_path; as funções das migrations 0004/0005 já o fazem.
--
-- Idempotente: `drop policy if exists` não falha se a política já tiver sido
-- removida manualmente no SQL Editor (como feito nesta revisão), e
-- `create or replace function` reaplica a definição com o search_path fixado.

-- 1) Remoção das políticas permissivas sinalizadas pelo Security Advisor,
--    criadas via dashboard (nomes em português, fora das migrations).
drop policy if exists "Permitir exclusao de analises" on public.analises;
drop policy if exists "Permitir insercao de analises" on public.analises;
drop policy if exists "Permitir leitura de analises" on public.analises;

-- 2) search_path fixado na função do contador (hardening padrão do Supabase):
--    impede que o search_path mutável do chamador redirecione tabelas/funções
--    não qualificadas para um schema malicioso (padrão das 0004/0005).
create or replace function public.incrementar_uso(p_chave text)
returns integer
language sql
set search_path = public
as $$
  insert into public.uso_analises (chave, contagem)
  values (p_chave, 1)
  on conflict (chave)
  do update set contagem = uso_analises.contagem + 1,
                atualizado_em = now()
  returning contagem;
$$;

-- Reforço (idempotente): somente o back-end (service_role) chama o contador;
-- clientes anônimos/autenticados não conseguem manipular o contador direto.
revoke execute on function public.incrementar_uso(text) from public, anon, authenticated;
grant execute on function public.incrementar_uso(text) to service_role;
