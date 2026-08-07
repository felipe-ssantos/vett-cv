-- Limite de análises: por sessão e global (por dia).
create table if not exists public.uso_analises (
  chave text primary key,
  contagem integer not null default 0,
  atualizado_em timestamptz not null default now()
);

alter table public.uso_analises enable row level security;

-- Incremento atômico: retorna a contagem nova para a chave
-- (ex.: "sessao:<uuid>:2026-08-07" ou "global:2026-08-07").
create or replace function public.incrementar_uso(p_chave text)
returns integer
language sql
as $$
  insert into public.uso_analises (chave, contagem)
  values (p_chave, 1)
  on conflict (chave)
  do update set contagem = uso_analises.contagem + 1,
                atualizado_em = now()
  returning contagem;
$$;

-- Somente o back-end (service_role) pode chamar a função; clientes anônimos
-- não conseguem manipular o contador diretamente.
revoke execute on function public.incrementar_uso(text) from public, anon, authenticated;
grant execute on function public.incrementar_uso(text) to service_role;
