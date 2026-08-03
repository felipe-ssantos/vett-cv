# Job Fit Analyzer

> Ferramenta com IA para analisar a compatibilidade entre um currículo e uma descrição de vaga.

Job Fit Analyzer é uma aplicação web criada para ajudar candidatos a avaliar o quanto seu currículo está alinhado com uma vaga específica.

O usuário cola a descrição de uma vaga, adiciona seu currículo (como texto ou arquivo PDF/DOCX) e solicita uma análise. A aplicação usa inteligência artificial para comparar o currículo com os requisitos da vaga e retorna um score de compatibilidade, análise por categorias, palavras-chave, pontos fortes, requisitos faltantes e sugestões de melhoria.

---

## Status do Projeto

**Projeto de portfólio — em desenvolvimento ativo**

O Job Fit Analyzer é um projeto pessoal de portfólio, criado para demonstrar habilidades práticas de desenvolvimento web moderno: front-end, integração com APIs, inteligência artificial, persistência em banco de dados e processamento de documentos.

O desenvolvimento é feito de forma incremental, com foco em qualidade de código, manutenibilidade, experiência do usuário e boas práticas reais de desenvolvimento.

> A aplicação não tem como objetivo substituir recrutadores profissionais ou plataformas de ATS. O propósito é oferecer ao candidato mais uma ferramenta para entender o alinhamento do seu currículo com uma vaga específica.

---

## Escopo do Projeto

O Job Fit Analyzer é um projeto pessoal, educacional e de portfólio.

Não tem como objetivo ser um produto comercial nem substituir sistemas profissionais de recrutamento, plataformas de ATS ou serviços de consultoria de carreira.

A aplicação serve principalmente para demonstrar a construção de uma aplicação web completa, integrando front-end, back-end/API, banco de dados, processamento de documentos e inteligência artificial.

---

## Funcionalidades

### Atuais / Planejadas

- [x] Colar descrição da vaga
- [x] Colar conteúdo do currículo
- [x] Upload de currículo em PDF ou DOCX
- [x] Extração de texto dos arquivos de currículo suportados
- [x] Análise de compatibilidade currículo/vaga com IA
- [x] Score de compatibilidade de 0 a 100
- [x] Análise por categoria
- [x] Palavras-chave presentes
- [x] Palavras-chave faltantes
- [x] Pontos fortes do candidato
- [x] Sugestões de melhoria para o currículo
- [x] Resumo gerado por IA
- [x] Recomendação acionável para melhorar o match
- [x] Armazenamento dos dados de análise no Supabase
- [ ] Melhorar UX/UI da aplicação
- [ ] Melhorar validação e tratamento de erros
- [ ] Melhorar responsividade
- [ ] Refinar prompts de IA e consistência das análises
- [ ] Melhorar histórico de análises
- [ ] Adicionar testes automatizados
- [ ] Melhorar acessibilidade
- [ ] Preparar para publicação

---

## Como Funciona

```text
Descrição da vaga
      │
      ▼
Currículo (texto / PDF / DOCX)
      │
      ▼
API da aplicação
      │
      ▼
Análise por IA
      │
      ▼
Resultado da compatibilidade
      │
      ├── Score de match
      ├── Score por categoria
      ├── Palavras-chave presentes
      ├── Palavras-chave faltantes
      ├── Pontos fortes
      ├── Sugestões de melhoria
      └── Recomendação final
      │
      ▼
Supabase
      │
      ▼
Resultado persistido
```

A ideia é manter a experiência simples:

**Colar → Analisar → Entender → Melhorar**

---

## Tecnologias Utilizadas

### Front-end
- React
- TypeScript
- Vite
- React Router
- Bootstrap

### Back-end / API
- Vercel Functions
- Node.js
- TypeScript

### Banco de Dados
- Supabase
- PostgreSQL

### Inteligência Artificial
- Google Gemini API

### Processamento de Documentos
- pdf-parse
- mammoth

### Ferramentas de Desenvolvimento
- Git
- GitHub
- ESLint
- npm

---

## Arquitetura

O projeto segue uma estrutura orientada a features, separando responsabilidades por domínio.

```text
src/
├── api/
│
├── components/
│   └── layout/
│
├── features/
│   ├── analises/
│   │   └── components/
│   │
│   ├── candidaturas/
│   │   └── components/
│   │
│   └── vagas/
│       └── components/
│
├── lib/
│
├── types/
│
└── ...
```

A aplicação é organizada em torno dos principais conceitos de domínio:

- **Vagas** — oportunidades de emprego e seus requisitos.
- **Candidaturas** — o currículo submetido para uma análise.
- **Análises** — avaliações geradas por IA a partir de um currículo e uma vaga.

O modelo de domínio pode evoluir conforme os requisitos da aplicação ficarem mais claros durante o desenvolvimento.

---

## Modelo de Dados

A aplicação atualmente utiliza três entidades principais:

**Vagas**
Armazena informações sobre uma oportunidade de emprego, como:
- Título da vaga
- Empresa
- Descrição completa
- Hard skills
- Soft skills
- Senioridade
- Data de criação

**Candidaturas**
Armazena o currículo submetido para uma análise e sua relação com uma vaga.

**Análises**
Armazena a avaliação gerada pela IA, associada a um currículo e uma vaga:
- Score de match
- Scores por categoria
- Palavras-chave presentes
- Palavras-chave faltantes
- Pontos fortes
- Sugestões de melhoria
- Resumo gerado por IA
- Recomendação final

---

## Análise por IA

A IA é responsável por comparar o currículo do candidato com os requisitos da vaga.

A análise é estruturada em múltiplas dimensões, em vez de depender apenas de um único score. As principais categorias são:

- Skills técnicas
- Ferramentas e tecnologias
- Experiência
- Soft skills

A IA também identifica:
- Palavras-chave já presentes no currículo
- Palavras-chave faltantes
- Pontos fortes do candidato
- Possíveis melhorias
- Uma avaliação geral concisa
- A ação mais impactante que o candidato pode tomar para melhorar seu match

O prompt de IA é tratado como parte da lógica de negócio da aplicação e pode ser refinado ao longo do desenvolvimento para melhorar a consistência e utilidade dos resultados.

---

## Variáveis de Ambiente

Crie um arquivo `.env` local e configure as variáveis de ambiente necessárias.

Exemplo:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
GEMINI_API_KEY=sua_chave_da_api_gemini
```

Nunca faça commit de chaves de API, credenciais ou outros segredos no repositório.

Certifique-se de configurar também as variáveis de ambiente necessárias no ambiente de deploy.

---

## Instalação

Clone o repositório:

```bash
git clone https://github.com/felipe-ssantos/job-fit-analyzer.git
```

Acesse o diretório do projeto:

```bash
cd job-fit-analyzer
```

Instale as dependências:

```bash
npm install
```

Crie sua configuração local de ambiente:

```bash
cp .env.example .env
```

Em seguida, configure as variáveis de ambiente necessárias.

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação ficará disponível pela URL local fornecida pelo Vite.

---

## Fluxo de Desenvolvimento

O desenvolvimento é feito usando branches separadas, para reduzir o risco de introduzir mudanças instáveis na branch de produção.

```text
main
 │
 │ estável / produção
 │
 └──── develop
         │
         ├── feature / fix
         ├── testes
         └── melhorias
```

### Branches

**main**
Contém versões estáveis da aplicação, prontas para produção. Só recebe merges após a implementação ser testada e validada.

**develop**
Usada como branch de integração e testes durante o desenvolvimento. Novas funcionalidades e correções são validadas aqui antes de serem promovidas para a `main`.

### Fluxo recomendado

```bash
git checkout develop
git pull origin develop

# Implementar e testar as mudanças localmente

git add .
git commit -m "feat: melhora fluxo de análise de currículo"
git push origin develop
```

Depois que a funcionalidade for testada e considerada estável, ela pode ser mesclada na `main`.

---

## Convenção de Commits

O projeto segue o padrão Conventional Commits.

Prefixos comuns:

```text
feat:     nova funcionalidade
fix:      correção de bug
refactor: reestruturação de código sem mudança de comportamento
style:    formatação ou mudanças visuais
docs:     alterações na documentação
test:     testes
chore:    tarefas de manutenção
```

Exemplos:

```text
feat: adiciona validação de upload de currículo
fix: impede envio de análise com currículo vazio
refactor: separa lógica da API de análise
style: melhora layout do resultado da análise
docs: atualiza instruções de configuração do projeto
```

Sempre que possível, mantenha os commits focados em uma única mudança lógica.

---

## Roadmap

O projeto é desenvolvido de forma incremental.

**Fase 1 — Fundação**
- Revisar arquitetura do projeto
- Alinhar schema do banco com os tipos da aplicação
- Estabilizar o fluxo principal de análise
- Garantir que a persistência no Supabase funcione corretamente
- Melhorar tratamento básico de erros

**Fase 2 — UX/UI**
- Melhorar layout e hierarquia visual
- Introduzir um design system consistente
- Melhorar formulários e inputs
- Melhorar estados de carregamento
- Melhorar estados vazios
- Melhorar estados de erro
- Melhorar responsividade mobile

**Fase 3 — Experiência de Análise**
- Melhorar apresentação do resultado da análise
- Melhorar visualização de score
- Melhorar apresentação de palavras-chave
- Melhorar sugestões e recomendações
- Refinar prompts de IA

**Fase 4 — Histórico e Dados**
- Melhorar histórico de análises
- Melhorar navegação entre análises
- Melhorar relacionamentos de dados armazenados
- Melhorar validação de dados

**Fase 5 — Qualidade**
- Adicionar testes automatizados
- Melhorar acessibilidade
- Revisar tipos TypeScript
- Revisar tratamento de erros
- Revisar comportamento da API
- Revisar segurança e políticas do Supabase

**Fase 6 — Publicação**
- Revisão final de UX/UI
- Testes em ambiente de produção
- Revisão de configuração de ambiente
- Revisão de performance
- Documentação final
- Merge da versão estável na `main`

---

## Considerações de Segurança

A aplicação processa informações de currículos, que podem conter dados pessoais. Por isso:

- Chaves de API nunca devem ser expostas no front-end.
- Segredos nunca devem ser commitados no Git.
- As políticas de acesso ao banco de dados devem ser revisadas antes de produção.
- A validação de entrada deve ser feita tanto no client quanto no server.
- Arquivos enviados pelo usuário devem ser validados antes do processamento.
- As políticas de acesso em produção devem ser mais rígidas do que em desenvolvimento.
- Informações pessoais só devem ser armazenadas quando necessário.

A aplicação atualmente é desenvolvida sem autenticação. As políticas de segurança e regras de acesso a dados precisarão ser revisadas antes de considerar a aplicação pronta para produção.

---

## Limitações

O projeto atual é uma aplicação experimental de portfólio e possui limitações.

A análise gerada por IA deve ser tratada como uma avaliação assistiva, e não como uma medida objetiva das qualificações profissionais de um candidato.

Um score de match alto não garante uma entrevista ou uma vaga. Da mesma forma, um score baixo não significa necessariamente que o candidato não é qualificado para a posição.

A qualidade da análise depende de fatores como:

- Qualidade da descrição da vaga
- Qualidade e completude do currículo
- Interpretação da IA
- Desenho do prompt
- Estruturação dos requisitos da vaga

---

## Possíveis Melhorias Futuras

- Autenticação e contas de usuário
- Histórico de análises privado
- Gerenciamento de versões de currículo
- Múltiplos perfis de currículo
- Exportar análise em PDF
- Análise mais detalhada orientada a ATS
- Melhorar matching semântico
- Normalização da descrição da vaga
- Assistência para otimização de currículo
- Comparação de análises entre versões de currículo
- Testes automatizados
- Melhorar acessibilidade
- Melhor performance e caching

---

## Contribuição

Este projeto é atualmente mantido como um projeto pessoal de portfólio.

Ainda assim, o código é desenvolvido seguindo práticas voltadas para legibilidade, manutenibilidade e um histórico de versões claro.

Caso o projeto seja aberto para contribuições externas no futuro, diretrizes de contribuição serão adicionadas.

---

## Licença

MIT

---

## Autor

**Felipe Santos**

Tecnólogo formado em Sistemas para Internet e desenvolvedor, focado na construção de aplicações práticas com tecnologias web modernas.

---

## Aviso

O Job Fit Analyzer é um projeto educacional e de portfólio.

A análise fornecida pela aplicação é gerada por inteligência artificial e não deve ser considerada como verdade absoluta sobre, carreira ou emprego.