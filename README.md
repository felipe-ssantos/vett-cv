# 🎯 Job Fit Analyzer

> Ferramenta com IA para analisar a compatibilidade entre um currículo e uma descrição de vaga.

O Job Fit Analyzer ajuda candidatos a entender o quanto seu currículo está alinhado com uma vaga específica. Basta colar a descrição da vaga, adicionar o currículo (texto, PDF ou DOCX) e pedir a análise. A IA compara os dois e retorna um score de compatibilidade, palavras-chave, pontos fortes e sugestões de melhoria.

---

## 📌 Status

**Projeto de portfólio — em desenvolvimento ativo**

Criado para demonstrar habilidades práticas de desenvolvimento web: front-end, integração com APIs, IA, banco de dados e processamento de documentos.

> ⚠️ Não substitui recrutadores ou plataformas de ATS. É uma ferramenta de apoio para o candidato entender seu alinhamento com uma vaga.

---

## ✨ Funcionalidades

- 📋 Colar descrição da vaga e currículo
- 📄 Upload de currículo em PDF ou DOCX
- 🤖 Análise de compatibilidade com IA
- 📊 Score de match (geral e por categoria)
- 🔑 Palavras-chave presentes e faltantes
- 💪 Pontos fortes do candidato
- 💡 Sugestões de melhoria e recomendação final
- 💾 Persistência dos resultados no Supabase

---

## 🔄 Como Funciona

\`\`\`text
Descrição da vaga + Currículo
            │
            ▼
        API (IA)
            │
            ▼
   Resultado da análise
   ├── Score de match
   ├── Score por categoria
   ├── Keywords (presentes / faltantes)
   ├── Pontos fortes
   └── Sugestões
            │
            ▼
        Supabase
\`\`\`

**Colar → Analisar → Entender → Melhorar**

---

## 🛠️ Tecnologias

**Front-end:** React · TypeScript · Vite · React Router · Bootstrap
**Back-end/API:** Vercel Functions · Node.js · TypeScript
**Banco de dados:** Supabase · PostgreSQL
**IA:** Google Gemini API
**Documentos:** pdf-parse · mammoth

---

## 🏗️ Arquitetura

\`\`\`text
src/
├── api/
├── components/layout/
├── features/
│   ├── analises/
│   ├── candidaturas/
│   └── vagas/
├── lib/
└── types/
\`\`\`

Organizado em torno de três domínios: **vagas** (oportunidades), **candidaturas** (currículo submetido) e **análises** (avaliação gerada por IA).

---

## ⚙️ Configuração

\`\`\`env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
GEMINI_API_KEY=sua_chave_da_api_gemini
\`\`\`

⚠️ Nunca faça commit de chaves ou segredos no repositório.

---

## 🚀 Instalação

\`\`\`bash
git clone https://github.com/felipe-ssantos/job-fit-analyzer.git
cd job-fit-analyzer
npm install
cp .env.example .env
npm run dev
\`\`\`

---

## 🌿 Fluxo de Desenvolvimento

- \`main\` → versão estável/produção
- \`develop\` → integração e testes de novas features

\`\`\`bash
git checkout develop
git pull origin develop
# implementar e testar
git add .
git commit -m "feat: melhora fluxo de análise de currículo"
git push origin develop
\`\`\`

Segue o padrão **Conventional Commits** (\`feat\`, \`fix\`, \`refactor\`, \`style\`, \`docs\`, \`test\`, \`chore\`).

---

## 🔒 Segurança

- Chaves de API só no back-end, nunca expostas no front
- Validação de entrada no client e no server
- Políticas de acesso ao Supabase revisadas antes de produção
- Aplicação ainda sem autenticação — dados pessoais tratados com cautela

---

## ⚠️ Limitações

A análise é gerada por IA e deve ser tratada como assistiva, não como medida objetiva de qualificação. Um score alto não garante entrevista; um score baixo não significa despreparo. O resultado depende da qualidade da vaga e do currículo informados.

---

## 🔮 Possíveis Melhorias Futuras

Autenticação · histórico privado · múltiplos perfis de currículo · exportação em PDF · matching semântico mais avançado · testes automatizados · melhorias de acessibilidade e performance

---

## 👤 Autor

**Felipe Santos**
Tecnólogo em Sistemas para Internet, focado em desenvolvimento web moderno.

---

## 📄 Aviso

Projeto educacional e de portfólio. A análise gerada por IA não deve ser considerada aconselhamento profissional de recrutamento, carreira ou emprego.