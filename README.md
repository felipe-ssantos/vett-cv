# 🎯 Vett

[![CI](https://github.com/felipe-ssantos/vett-cv/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-ssantos/vett-cv/actions/workflows/ci.yml)

> Ferramenta com IA que analisa a compatibilidade entre um currículo e uma descrição de vaga.
>
> **Produção:** https://vettcv.vercel.app

O Vett ajuda candidatos a entenderem o alinhamento do seu perfil com uma oportunidade antes de se candidatarem. Basta colar a descrição da vaga, adicionar o currículo (texto ou arquivo PDF/DOCX) e a IA compara os dois, retornando um score de compatibilidade, palavras-chave presentes e faltantes, pontos fortes e sugestões objetivas de ajuste.

---

## ✨ Funcionalidades

- **Análise com IA** — score de match geral e por categoria (skills técnicas, ferramentas, experiência e soft skills)
- **Upload de currículo** — PDF ou DOCX (até 4 MB), com extração automática do texto
- **Ou cola o texto** — alternativa para quem prefere colar o currículo diretamente
- **Relatório completo** — pontos fortes, lacunas e sugestões de melhoria
- **Histórico privado** — análises salvas no Supabase, isoladas por sessão anônima e limitadas às 25 mais recentes
- **Cota do dia visível** — análises restantes e horário de renovação exibidos na tela de análise
- **Modo claro/escuro** — alternância no cabeçalho, com persistência e respeito à preferência do sistema
- **Reanálise** — novo currículo comparado com uma vaga já analisada
- **Acessível** — labels, landmarks e diálogos testados com `axe`
- **Carregamento rápido** — code-splitting por rota (lazy loading) e chunks de vendor (react, supabase) com cache de longo prazo

---

## 🛠️ Stack

| Camada | Tecnologias |
| ------ | ----------- |
| Front-end | React 19 · TypeScript · Vite · React Router · Bootstrap 5 |
| Back-end | Vercel Serverless Functions · Node.js |
| IA | Google Gemini (Flash Lite) |
| Banco de dados | Supabase · PostgreSQL |
| Documentos | pdf-parse · mammoth |
| Testes | Vitest · Testing Library · vitest-axe |

---

## 🏗️ Estrutura

```textile
.
├── api/                     # Serverless functions (análise com IA)
├── public/
├── scripts/                 # Ferramentas de validação (ex.: check de migrations)
├── supabase/migrations/     # SQL versionado (tabelas, RLS, limites e limpeza)
└── src/
    ├── components/layout/   # Header, Footer, Layout (com seus CSS Modules)
    ├── features/analises/   # Workspace, histórico, detalhe e reanálise
    │   ├── components/      # Telas + ConfirmModal e RelatorioAnalise (apresentação pura)
    │   ├── hooks/           # useAnaliseCurriculo e useArquivoCurriculo
    │   └── lib/             # mapearParaRelatorio (Analise → AnaliseMatchIA)
    ├── features/privacidade/ # Política de Privacidade (rota /privacidade)
    ├── lib/                 # Cliente Supabase e utilitários
    ├── routes/              # Rotas da aplicação
    ├── styles/ui/           # Primitivas CSS Modules (Card, Form, Button...)
    ├── test/                # Setup, fixtures e matchers de teste
    └── types/               # Tipos compartilhados
```

---

## 🚀 Como executar

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) e chave de API do [Google AI Studio](https://aistudio.google.com)

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/felipe-ssantos/vett-cv.git
cd vett-cv

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.local.example .env.local
```

### Configure o banco (uma vez)

No SQL Editor do Supabase (Dashboard → SQL Editor), execute **em ordem** o
conteúdo dos arquivos de `supabase/migrations/`:

1. `0001_uso_analises.sql` — tabela `uso_analises` + função `incrementar_uso`
   (limite diário de análises);
2. `0002_analises.sql` — tabela `analises` + políticas de RLS por sessão
   (cada navegador enxerga apenas o próprio histórico).
3. `0003_remover_curriculo_texto.sql` — remove a coluna `curriculo_texto`
   (o texto integral do currículo não é persistido — minimização de PII).
4. `0004_limpeza_uso_analises.sql` — índice, função `limpar_uso_antigo()` e
   agendamento diário com pg_cron (purga de contadores antigos; se o plano não
   tiver pg_cron, a migração roda sem erro e a limpeza fica manual).
5. `0005_limite_historico_analises.sql` — trigger que mantém no máximo as 25
   análises mais recentes por sessão (as mais antigas são removidas
   automaticamente ao salvar uma nova).

### Variáveis de ambiente

| Variável | Descrição |
| -------- | --------- |
| `VITE_SUPABASE_URL` | URL do projeto no Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `GEMINI_API_KEY` | Chave da API do Google Gemini (usada apenas no back-end) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (apenas no back-end, para o limite diário de análises). `SUPABASE_URL` é opcional — sem ela, a API reusa `VITE_SUPABASE_URL` |
| `RATE_LIMIT_IP_SECRET` | Opcional — segredo usado no hash anônimo do IP (limite por navegador). Sem ela, a API usa `SUPABASE_SERVICE_ROLE_KEY` como segredo |

### Rodando

```bash
npm run dev        # Front-end em modo desenvolvimento
npm run dev:api    # API local via Vercel (após build da API)
```

---

## 🧪 Testes

A suíte usa Vitest, Testing Library e `vitest-axe` para checagem de acessibilidade.

```bash
npm test                 # Executa todos os testes uma única vez
npm run test:watch       # Modo watch — reexecuta a cada mudança
npm run check:migrations # Valida a sintaxe SQL de supabase/migrations (pgsql-parser)
```

O `check:migrations` usa o `pgsql-parser` (libpg_query compilado para WASM — o
mesmo parser do PostgreSQL) para validar todas as migrations sem precisar de
banco, e o CI roda essa checagem em todo push/PR.

**Cobertura:**

- Acessibilidade (`*.a11y.test.tsx`) com as regras do `axe`
- Unitários dos formulários de análise: upload de arquivo, atalho Esc, foco automático e limite de 4 MB
- O build de produção (`npm run build`) também valida o TypeScript via `tsc -b`

Os testes ficam colocalizados ao lado dos componentes e não entram no bundle de produção.

---

## 🔒 Segurança

- Chave da IA somente no back-end (nunca exposta no front)
- Validação de entrada no cliente e no servidor (incluindo formato e tamanho do arquivo)
- Políticas de RLS no Supabase para isolamento das análises por sessão
- O texto integral do currículo não é armazenado: é usado apenas na análise e descartado
- Acesso ao banco via sessão anônima — dados tratados com cautela

---

## ⚙️ Limites de uso

O Vett tem três camadas de limite, com propósitos diferentes:

| Limite | Valor | O que controla | Renovação |
| ------ | ----- | -------------- | --------- |
| **Por navegador** (sessão anônima + hash de IP) | **5 análises/dia** | Uso individual — anti-abuso e fair use | Meia-noite UTC |
| **Global** | **100 análises/dia** | Capacidade do serviço — protege a cota gratuita da IA | Meia-noite UTC |
| **Histórico salvo** | **25 análises** | Retenção — quantas análises ficam salvas por usuário | Rotativo (a mais antiga sai ao salvar a 26ª) |

Ao atingir o limite diário, a API responde `429` com uma mensagem clara. O
histórico é limitado por um trigger no banco (migration `0005`): ao inserir
uma nova análise, as mais antigas além da 25ª do mesmo usuário são removidas
automaticamente — nunca toca em dados de outros usuários.

O navegador é identificado de duas formas complementares: pela **sessão
anônima** (armazenamento local) e por um **hash anônimo do IP** (HMAC-SHA256
com segredo do servidor — o IP bruto nunca é persistido). O limite vale para o
maior uso entre os dois, então limpar os dados do navegador não zera o limite
do dia. Como IPs podem ser compartilhados (NAT/escritório), usuários na mesma
rede dividem as 5 análises — comportamento esperado.

Comportamento em falha do contador (Supabase): o teto **global é fail-closed**
(se o contador estiver indisponível, a análise é bloqueada com `503` para
proteger a cota da IA), enquanto os limites por navegador são fail-open (só
são aplicados quando o contador responde).

---

## 🌿 Fluxo de desenvolvimento

- `main` → versão estável (produção)
- `develop` → integração de novas features

Segue o padrão **Conventional Commits** (`feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`).

---

## 👤 Autor

**Felipe Santos** — Tecnólogo em Sistemas para Internet, focado em desenvolvimento web moderno.

---

## 📄 Aviso

Projeto de portfólio. A análise gerada por IA não substitui recrutadores ou plataformas de ATS e não deve ser tratada como verdade absoluta ou aconselhamento profissional de recrutamento, carreira ou emprego.
