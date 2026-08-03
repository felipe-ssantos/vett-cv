import type { AnaliseMatchIA } from "../types";

export interface MatchPorCategoriaDb {
  skills_tecnicas: number;
  ferramentas: number;
  experiencia: number;
  soft_skills: number;
}

export function normalizarMatchPorCategoria(
  matchPorCategoria: AnaliseMatchIA["matchPorCategoria"],
): MatchPorCategoriaDb {
  return {
    skills_tecnicas: matchPorCategoria.skillsTecnicas,
    ferramentas: matchPorCategoria.ferramentas,
    experiencia: matchPorCategoria.experiencia,
    soft_skills: matchPorCategoria.softSkills,
  };
}
