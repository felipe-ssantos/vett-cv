-- Tabela `analises`: histórico de análises, individualizado por sessão anônima.
--
-- IMPORTANTE: esta migração é DOCUMENTAÇÃO versionada — a tabela já existe no
-- banco (criada via Dashboard) e NÃO deve ser executada de novo no projeto
-- atual. Ela existe para reproduzir o schema do zero (aplicar 0001 e 0002 em
-- ordem) e para registrar as políticas de RLS por sessão.
--
-- A DDL e o índice são idempotentes (IF NOT EXISTS). Já as políticas de RLS
-- usam CREATE POLICY, que no Postgres não tem IF NOT EXISTS: em banco novo
-- elas são criadas normalmente, mas não re-execute o arquivo num banco que já
-- tenha policies com os mesmos nomes (ex.: criadas pelo Dashboard).
--
-- As policies abaixo seguem o padrão confirmado no projeto (sessão anônima →
-- role authenticated, isolamento por user_id = auth.uid()). Antes de qualquer
-- ajuste, confira nomes e operações em Supabase > Database > Policies.

create table if not exists public.analises (
  id uuid not null default gen_random_uuid(),
  score_match integer not null,
  match_por_categoria jsonb,
  keywords_presentes text[] not null default '{}'::text[],
  keywords_faltando text[] not null default '{}'::text[],
  pontos_fortes text[] not null default '{}'::text[],
  sugestoes_ajuste text[] not null default '{}'::text[],
  resumo_ia text,
  dica_final text,
  created_at timestamptz not null default now(), -- NOT NULL (aprimorado vs. export)
  titulo_vaga text not null,
  empresa text,
  descricao_vaga text not null,
  hard_skills text[] not null default '{}'::text[],
  soft_skills text[] not null default '{}'::text[],
  senioridade text,
  curriculo_texto text not null,
  user_id uuid default auth.uid(),
  constraint analises_pkey primary key (id),
  constraint analises_user_id_fkey foreign key (user_id) references auth.users (id)
);

-- As consultas do app sempre filtram pela sessão (lista e detalhe do
-- histórico); o índice acelera essas buscas e as políticas de RLS.
create index if not exists analises_user_id_idx on public.analises (user_id);

-- RLS: cada sessão anônima enxerga e gerencia apenas as próprias análises.
-- Obs.: usuários anônimos do Supabase (signInAnonymously) usam o role
-- `authenticated` (com a claim is_anonymous) — por isso as policies são
-- `to authenticated`, não `to anon`.
alter table public.analises enable row level security;

create policy "analises_select_propria" on public.analises
  for select to authenticated
  using (user_id = auth.uid());

create policy "analises_insert_propria" on public.analises
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "analises_delete_propria" on public.analises
  for delete to authenticated
  using (user_id = auth.uid());

-- O app hoje não edita análises; se um dia houver edição, adicione uma policy
-- `for update` equivalente (using + with check user_id = auth.uid()).
