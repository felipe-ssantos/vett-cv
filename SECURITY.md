# Segurança — Job Fit Analyzer

Este é um projeto de portfólio, com código aberto e demo pública. Este
documento registra o estado conhecido de segurança do projeto e as decisões
tomadas conscientemente, para que qualquer pessoa que revise o repositório
entenda o contexto por trás dos alertas abertos no GitHub.

## Vulnerabilidades de dependências — risco aceito

O `npm audit` reporta hoje 4 vulnerabilidades sem correção segura disponível.
Todas vêm de dependências transitivas do `@vercel/node` (ferramenta de build
da Vercel usada só durante `vercel dev` / deploy), não de código que roda em
produção nem que processa dados enviados pelos usuários do site.

| Pacote | Severidade | Motivo do risco aceito |
|---|---|---|
| `path-to-regexp` | Alta | Corrigir exige salto para a major 8.x. A própria Vercel já tentou uma atualização menor (6.1.0 → 6.3.0) internamente e reverteu por quebrar comportamento de roteamento. Sem correção segura disponível hoje. |
| `undici` | Alta | Corrigir exigiria rebaixar `@vercel/node` para a versão `4.0.0` (downgrade grande, pior que o problema atual). |
| `ajv` | Moderada | Mesma cadeia de dependência do `path-to-regexp`/`undici`, mesmo bloqueio. |
| `react-router` | Alta (CSRF em modo RSC) | Corrigir exige subir de React Router 7.x para 8.x — mudança de major version com possíveis breaking changes de API (rotas, `useParams`, `useNavigate`), usada em todo o app. Requer teste de regressão completo antes de aplicar; não é seguro fazer via `npm audit fix --force` sem validação manual. |

**Mitigação real:** os três primeiros itens (`path-to-regexp`, `undici`, `ajv`)
afetam apenas o roteamento e HTTP internos das ferramentas de build da
Vercel — não recebem texto de currículo, descrição de vaga, nem qualquer
input de quem usa o site. O `react-router` roda no navegador do usuário, mas
o vetor da CVE (RSC — React Server Components) não é usado neste projeto
(o app é uma SPA client-side, sem RSC).

Este documento deve ser revisado periodicamente — em especial o item do
`react-router`, que tem um caminho de correção conhecido (upgrade para a
major 8.x) e pode ser resolvido numa etapa dedicada de teste.

Outras vulnerabilidades já foram corrigidas via `overrides` no
`package.json` (`minimatch`, `smol-toml`, `js-yaml`), sem necessidade de
downgrade de nenhuma dependência principal.

## Row Level Security (Supabase)

Todas as análises são vinculadas a uma sessão anônima do Supabase Auth
(`signInAnonymously`), sem exigir cadastro. As policies de RLS restringem
leitura e escrita da tabela `analises` ao dono da sessão (`auth.uid()`),
de forma que o histórico de cada visitante é privado — nenhum currículo ou
descrição de vaga enviado por um usuário é visível a outro.

## Reportando um problema

Este é um projeto de portfólio sem processo formal de disclosure. Para
reportar algo, abra uma issue no repositório.