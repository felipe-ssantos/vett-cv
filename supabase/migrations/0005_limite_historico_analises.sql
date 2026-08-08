-- Limite de 10 análises salvas por usuário.
--
-- A cota diária (0001) limita quantas análises NOVAS podem ser feitas por
-- dia, mas o histórico (`analises`) acumula sem limite: 5 hoje + 5 amanhã =
-- 10, 15, 20... Para o usuário manter o histórico sob controle, limitamos o
-- armazenamento às 10 análises mais recentes por sessão.
--
-- Regra: ao inserir uma análise, as mais antigas além da 10ª mais recente do
-- MESMO usuário são removidas automaticamente (nunca toca em dados de outros).

-- 1) Função de trigger: apaga as análises mais antigas que ultrapassam o
--    limite de 10 para o usuário da linha inserida.
--
--    Sem `security definer`: a função roda como o usuário autenticado, então
--    a própria RLS (política `analises_delete_propria`, user_id = auth.uid())
--    garante que só as linhas do próprio usuário podem ser removidas.
create or replace function public.limitar_historico_analises()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_limite constant integer := 10;
begin
  delete from public.analises
  where user_id = new.user_id
    and id in (
      select id
      from public.analises
      where user_id = new.user_id
      order by created_at desc, id desc
      offset v_limite
    );
  return new;
end;
$$;

-- Impede que clientes chamem a função diretamente (ela só deve rodar via
-- trigger). O trigger em si roda com os privilégios de quem inseriu a linha.
revoke execute on function public.limitar_historico_analises() from public, anon, authenticated;
grant execute on function public.limitar_historico_analises() to service_role;

-- 2) Trigger AFTER INSERT (drop prévio mantém a migração idempotente).
drop trigger if exists analises_limitar_historico on public.analises;
create trigger analises_limitar_historico
  after insert on public.analises
  for each row
  execute function public.limitar_historico_analises();
