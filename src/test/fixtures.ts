import type { Analise } from "../types";

export const analiseFixture: Analise = {
  id: "analise-1",
  titulo_vaga: "Analista de Dados Sênior",
  empresa: "TechCorp",
  descricao_vaga: "Buscamos analista com SQL e Python para o time de dados.",
  hard_skills: ["SQL", "Python"],
  soft_skills: ["Comunicação"],
  senioridade: "Sênior",
  curriculo_texto: "Perfil com experiência em SQL e Python.",
  score_match: 75,
  match_por_categoria: {
    skills_tecnicas: 80,
    ferramentas: 70,
    experiencia: 60,
    soft_skills: 90,
  },
  keywords_presentes: ["SQL"],
  keywords_faltando: ["Python"],
  pontos_fortes: ["SQL"],
  sugestoes_ajuste: ["Adicionar Python ao currículo."],
  resumo_ia: "Boa compatibilidade com a vaga.",
  dica_final: "Reforce sua experiência com Python.",
  created_at: "2026-01-01T00:00:00.000Z",
};

export const analisesFixture: Analise[] = [
  analiseFixture,
  {
    ...analiseFixture,
    id: "analise-2",
    titulo_vaga: "Engenheiro de Software",
    empresa: "StartupX",
    score_match: 45,
    keywords_presentes: ["React"],
    keywords_faltando: ["TypeScript"],
  },
];
