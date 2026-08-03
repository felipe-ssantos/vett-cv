import type { MatchPorCategoriaDb } from "../lib/normalizarAnalise";

// Tipos de Domínio
export interface Vaga {
  id: string;
  titulo: string;
  empresa?: string;
  descricao_completa: string;
  hard_skills: string[];
  soft_skills: string[];
  senioridade?: string;
  created_at: string;
}

export interface Candidatura {
  id: string;
  vaga_id: string;
  nome_candidato?: string;
  curriculo_texto: string;
  curriculo_arquivo_url?: string;
  status: string;
  created_at: string;
}

export interface Analise {
  id: string;
  candidatura_id: string;
  vaga_id: string;
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

// Tipo para o retorno da IA (Vercel Function)
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
