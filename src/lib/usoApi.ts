import { obterIdSessao } from "./analisarApi";

const TIMEOUT_COTA_MS = 10_000;

export interface ContadorDeUso {
  usado: number;
  limite: number;
  restante: number;
}

export interface CotaAnalises {
  /** Cota da sessão anônima atual; null quando não há sessão ou o serviço está fora. */
  sessao: ContadorDeUso | null;
  /** Cota global do dia; null quando o serviço de contador está indisponível. */
  global: ContadorDeUso | null;
  /** Próxima meia-noite UTC (ISO) — quando a cota diária renova. */
  renovaEm: string | null;
}

function ehContadorDeUso(valor: unknown): valor is ContadorDeUso {
  if (typeof valor !== "object" || valor === null) return false;
  const contador = valor as Record<string, unknown>;
  return (
    typeof contador.usado === "number" &&
    typeof contador.limite === "number" &&
    typeof contador.restante === "number"
  );
}

// Valida o shape da resposta: evita que um corpo inesperado renderize
// "undefined de undefined análises" no badge.
function validarCota(corpo: unknown): CotaAnalises | null {
  if (typeof corpo !== "object" || corpo === null) return null;
  const cota = corpo as Record<string, unknown>;

  if (cota.sessao !== null && !ehContadorDeUso(cota.sessao)) return null;
  if (cota.global !== null && !ehContadorDeUso(cota.global)) return null;
  if (typeof cota.renovaEm !== "string" && cota.renovaEm !== null) return null;

  return {
    sessao: (cota.sessao as ContadorDeUso | null) ?? null,
    global: (cota.global as ContadorDeUso | null) ?? null,
    renovaEm: (cota.renovaEm as string | null) ?? null,
  };
}

/**
 * Consulta a cota diária de análises (por sessão e global) no endpoint
 * `GET /api/uso`. Falhas (rede, timeout ou resposta inválida) nunca devem
 * quebrar a tela: retorna null e a UI esconde o indicador de cota.
 */
export async function buscarCotaAnalises(): Promise<CotaAnalises | null> {
  try {
    const sessaoId = await obterIdSessao();
    const url = sessaoId
      ? `/api/uso?sessaoId=${encodeURIComponent(sessaoId)}`
      : "/api/uso";

    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), TIMEOUT_COTA_MS);
    try {
      const resposta = await fetch(url, { signal: controlador.signal });
      if (!resposta.ok) return null;
      return validarCota(await resposta.json());
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}
