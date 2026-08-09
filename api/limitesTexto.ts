// Teto de caracteres para os textos do usuário (currículo e descrição da
// vaga), aplicado ANTES de montar o prompt e consumir a cota da IA. O client
// usa o mesmo valor (LIMITE_CARACTERES em useAnaliseCurriculo.ts).
export const LIMITE_CARACTERES_TEXTO = 8000;

export interface CampoDeTexto {
  /** Nome do campo exibido nas mensagens de erro. */
  nome: string;
  /** Valor enviado (undefined/ausente = sem restrição). */
  valor: string | undefined;
}

/**
 * Retorna o nome do primeiro campo que excede o teto de caracteres, ou null
 * se todos estiverem dentro do limite. Função pura — fácil de testar e usada
 * pelo handler de análise antes de qualquer chamada à IA.
 */
export function campoExcedeLimiteDeTexto(
  campos: CampoDeTexto[],
  limite: number = LIMITE_CARACTERES_TEXTO,
): string | null {
  for (const campo of campos) {
    if (campo.valor !== undefined && campo.valor.length > limite) {
      return campo.nome;
    }
  }
  return null;
}
