-- Minimização de PII: o texto integral do currículo não é exibido em nenhuma
-- tela (o detalhe e a reanálise usam apenas os dados da vaga). Remover a
-- coluna elimina a retenção do currículo completo no banco.
alter table public.analises drop column if exists curriculo_texto;
