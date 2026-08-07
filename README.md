# 🎯 Vett

[![CI](https://github.com/felipe-ssantos/vett-cv/actions/workflows/ci.yml/badge.svg)](https://github.com/felipe-ssantos/vett-cv/actions/workflows/ci.yml)

> Ferramenta com IA que analisa a compatibilidade entre um currículo e uma descrição de vaga.

O Vett ajuda candidatos a entenderem o alinhamento do seu perfil com uma oportunidade antes de se candidatarem. Basta colar a descrição da vaga, adicionar o currículo (texto ou arquivo PDF/DOCX) e a IA compara os dois, retornando um score de compatibilidade, palavras-chave presentes e faltantes, pontos fortes e sugestões objetivas de ajuste.

---

## ✨ Funcionalidades

- **Análise com IA** — score de match geral e por categoria (skills técnicas, ferramentas, experiência e soft skills)
- **Upload de currículo** — PDF ou DOCX (até 4 MB), com extração automática do texto
- **Ou cola o texto** — alternativa para quem prefere colar o currículo diretamente
- **Relatório completo** — pontos fortes, lacunas e sugestões de melhoria
- **Histórico privado** — análises salvas no Supabase e isoladas por sessão anônima
- **Reanálise** — novo currículo comparado com uma vaga já analisada
- **Acessível** — labels, landmarks e diálogos testados com `axe`

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
└── src/
    ├── components/layout/   # Header, Footer, Layout
    ├── features/
    │   └── analises/        # Lista, detalhe, workspace e reanálise
    ├── lib/                 # Cliente Supabase e utilitários
    ├── routes/              # Rotas da aplicação
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

No SQL Editor do Supabase (Dashboard → SQL Editor), execute o conteúdo de
`supabase/migrations/0001_uso_analises.sql` — cria a tabela `uso_analises` e a
função `incrementar_uso` usadas no limite diário de análises.

### Variáveis de ambiente

| Variável | Descrição |
| -------- | --------- |
| `VITE_SUPABASE_URL` | URL do projeto no Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `GEMINI_API_KEY` | Chave da API do Google Gemini (usada apenas no back-end) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (apenas no back-end, para o limite diário de análises). `SUPABASE_URL` é opcional — sem ela, a API reusa `VITE_SUPABASE_URL` |

### Rodando

```bash
npm run dev        # Front-end em modo desenvolvimento
npm run dev:api    # API local via Vercel (após build da API)
```

---

## 🧪 Testes

A suíte usa Vitest, Testing Library e `vitest-axe` para checagem de acessibilidade.

```bash
npm test           # Executa todos os testes uma única vez
npm run test:watch # Modo watch — reexecuta a cada mudança
```

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
- Acesso ao banco via sessão anônima — dados tratados com cautela

---

## ⚙️ Limites de uso

Para proteger as cotas gratuitas do Gemini e do Supabase, cada navegador pode
fazer **5 análises por dia** e o Vett tem um teto global de **100 análises por
dia**. Ao atingir o limite, a API responde `429` com uma mensagem clara.

O limite por navegador usa o armazenamento local da sessão anônima — não é uma
barreira de segurança (pode ser zerado limpando os dados do navegador). O teto
global é a proteção real contra abuso e só pode ser alterado pelo back-end.

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
