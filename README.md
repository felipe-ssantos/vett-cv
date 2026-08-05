# 🎯 Vett

> Ferramenta com IA para analisar a compatibilidade entre um currículo e uma descrição de vaga.

O Vett ajuda candidatos a entender o quanto seu currículo está alinhado com uma vaga específica. Basta colar a descrição da vaga, adicionar o currículo (texto, PDF ou DOCX) e pedir a análise. A IA compara os dois e retorna um score de compatibilidade, palavras-chave, pontos fortes e sugestões de melhoria.

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

**Front-end**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

**Back-end / API**

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

**Banco de dados**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)

**Inteligência Artificial**

![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)

**Documentos**

![pdf-parse](https://img.shields.io/badge/pdf--parse-EC1C24?style=for-the-badge&logo=adobeacrobatreader&logoColor=white)
![mammoth](https://img.shields.io/badge/mammoth-2B579A?style=for-the-badge&logo=microsoftword&logoColor=white)

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
git clone https://github.com/felipe-ssantos/vett-cv.git
cd vett-cv
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

Projeto educacional e de portfólio. A análise gerada por IA não deve ser considerada como verdade absoluta ou aconselhamento profissional de recrutamento, carreira ou emprego.