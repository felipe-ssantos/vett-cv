-- Limpeza das chaves DIÁRIAS antigas do contador de uso — pós-janela de 3h.
--
-- Antes da mudança para janelas de 3 horas, as chaves por navegador eram
-- diárias: "sessao:<uuid>:2026-08-09" e "ip:<hash>:2026-08-09" (data sem hora).
-- Depois do deploy, as chaves novas incluem a hora da janela
-- ("...:2026-08-09T15") e as diárias antigas ficam órfãs até a limpeza
-- automática da migration 0004 (8 dias por `atualizado_em`). Esta migration
-- remove imediatamente as chaves diárias antigas de SESSÃO e IP.
--
-- Preservadas de propósito:
--   - "global:2026-08-09" — o teto global continua DIÁRIO e segue em uso;
--   - "sessao:<uuid>:2026-08-09T15" / "ip:<hash>:2026-08-09T15" — janela de 3h.
--
-- Idempotente (rodar de novo não apaga nada novo) e segura para executar no
-- SQL Editor do Supabase. As janelas de 3h se renovam sozinhas — não há
-- contador de janela a zerar aqui.
delete from public.uso_analises
where chave ~ '^(sessao|ip):[^:]+:[0-9]{4}-[0-9]{2}-[0-9]{2}$';
