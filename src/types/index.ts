import type { MatchPorCategoriaDb } from "../lib/normalizarAnalise";

export interface Analise {
  id: string;
  titulo_vaga: string;
  empresa?: string;
  descricao_vaga: string;
  hard_skills: string[];
  soft_skills: string[];
  senioridade?: string;
  curriculo_texto: string;
  score_match: number;
  match_por_categoria?: MatchPorCategoriaDb;
  keywords_presentes: string[];
  keywords_faltando: string[];
  pontos_fortes: string[];
  sugestoes_ajuste: string[];
  resumo_ia: string;
  dica_final?: string;
  created_at: string;
}

export interface VagaExtraidaIA {
  titulo: string;
  empresa: string | null;
  hardSkills: string[];
  softSkills: string[];
  senioridade: string | null;
}

export interface AnaliseMatchIA {
  scoreMatch: number;
  matchPorCategoria: {
    skillsTecnicas: number;
    ferramentas: number;
    experiencia: number;
    softSkills: number;
  };
  keywordsPresentes: string[];
  keywordsFaltando: string[];
  pontosFortes: string[];
  sugestoesAjuste: string[];
  resumoIA: string;
  dicaFinal: string;
}
