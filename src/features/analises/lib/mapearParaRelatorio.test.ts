import { describe, expect, it } from "vitest";
import { mapearParaRelatorio } from "./mapearParaRelatorio";
import type { Analise } from "../../../types";

function criarAnalise(sobrescrever?: Partial<Analise>): Analise {
  return {
    id: "analise-1",
    titulo_vaga: "Analista de Dados",
    empresa: "TechCorp",
    descricao_vaga: "Vaga com SQL e Python.",
    hard_skills: ["SQL"],
    soft_skills: ["Comunicação"],
    senioridade: "Pleno",
    curriculo_texto: "Perfil com SQL.",
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
    sugestoes_ajuste: ["Aprender Python"],
    resumo_ia: "Boa compatibilidade.",
    dica_final: "Reforce Python.",
    created_at: "2026-01-01T00:00:00.000Z",
    ...sobrescrever,
  };
}

describe("mapearParaRelatorio", () => {
  it("mapeia os campos snake_case para camelCase", () => {
    const resultado = mapearParaRelatorio(criarAnalise());

    expect(resultado).toEqual({
      scoreMatch: 75,
      matchPorCategoria: {
        skills_tecnicas: 80,
        ferramentas: 70,
        experiencia: 60,
        soft_skills: 90,
      },
      keywordsPresentes: ["SQL"],
      keywordsFaltando: ["Python"],
      pontosFortes: ["SQL"],
      sugestoesAjuste: ["Aprender Python"],
      resumoIA: "Boa compatibilidade.",
      dicaFinal: "Reforce Python.",
    });
  });

  it("preserva matchPorCategoria ausente (undefined) para o layout do relatório", () => {
    const resultado = mapearParaRelatorio(
      criarAnalise({ match_por_categoria: undefined }),
    );

    expect(resultado.matchPorCategoria).toBeUndefined();
  });

  it("converte dica_final ausente em string vazia", () => {
    const resultado = mapearParaRelatorio(
      criarAnalise({ dica_final: undefined }),
    );

    expect(resultado.dicaFinal).toBe("");
  });
});
