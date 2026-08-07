import type { Analise, AnaliseMatchIA } from "../../../types";

/**
 * Adapta uma análise persistida no banco (formato snake_case) para o formato
 * consumido pelo RelatorioAnalise (camelCase), permitindo que o AnaliseDetalhe
 * reutilize o mesmo componente do AnaliseWorkspace.
 */
export function mapearParaRelatorio(analise: Analise): AnaliseMatchIA {
  return {
    scoreMatch: analise.score_match,
    matchPorCategoria: analise.match_por_categoria,
    keywordsPresentes: analise.keywords_presentes,
    keywordsFaltando: analise.keywords_faltando,
    pontosFortes: analise.pontos_fortes,
    sugestoesAjuste: analise.sugestoes_ajuste,
    resumoIA: analise.resumo_ia,
    dicaFinal: analise.dica_final ?? "",
  };
}
