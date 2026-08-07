# Segurança — Vett

Este é um projeto de portfólio, com código aberto e demo pública. Este
documento registra o estado conhecido de segurança do projeto e as decisões
tomadas conscientemente, para que qualquer pessoa que revise o repositório
entenda o contexto.

## Vulnerabilidades de dependências

O `npm audit` reporta **0 vulnerabilidades** no estado atual do projeto.

As vulnerabilidades anteriormente conhecidas foram todas corrigidas:

| Pacote | Situação anterior | Correção aplicada |
|---|---|---|
| `react-router` (CSRF em modo RSC) | Risco aceito na v7.x — migração para a major 8.x exigia testes de regressão | Migrado para **v8.3.0** com testes de regressão concluídos |
| `path-to-regexp` | Risco aceito, sem correção segura na cadeia do `@vercel/node` | Corrigido via `overrides` para `6.3.0` |
| `undici` | Risco aceito, downgrade pior que o problema | Corrigido via `overrides` para `6.28.0` |
| `ajv` | Risco aceito, mesma cadeia de dependência | Corrigido via `overrides` para `8.20.0` |

Correções adicionais aplicadas via `overrides` no `package.json`:
`minimatch`, `smol-toml` e `js-yaml`.

## Row Level Security (Supabase)

Todas as análises são vinculadas a uma sessão anônima do Supabase Auth
(`signInAnonymously`), sem exigir cadastro. As policies de RLS restringem
leitura e escrita da tabela `analises` ao dono da sessão (`auth.uid()`),
de forma que o histórico de cada visitante é privado — nenhum currículo ou
descrição de vaga enviado por um usuário é visível a outro.

## Reportando um problema

Este é um projeto de portfólio sem processo formal de disclosure. Para
reportar algo, abra uma issue no repositório.
