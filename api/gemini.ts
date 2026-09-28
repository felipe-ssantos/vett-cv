// Chamada à API do Gemini (Google). Módulo com dependências injetáveis
// (`fetchImpl`, `timeoutMs`, `modelos` e `esperaMs`) para ser testável
// isoladamente: o timeout com AbortController, o retry e o fallback de modelo
// podem ser cobertos sem rede real.

export class ErroTimeoutIA extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroTimeoutIA";
  }
}

// A cadeia de modelos se esgotou por indisponibilidade do provedor: HTTP
// 429/5xx (típico da camada gratuita em horário de pico) ou falha de rede.
// O handler responde 503 — o problema é do provedor, não da aplicação.
export class ErroIAIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroIAIndisponivel";
  }
}

// A IA respondeu, mas sem conteúdo utilizável: resposta bloqueada, sem
// `candidates` ou sem texto. O handler responde 502.
export class ErroRespostaIA extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroRespostaIA";
  }
}

// Timeout de cada tentativa (AbortController). A Vercel já impõe `maxDuration`
// (60s); este teto evita que uma resposta lenta da Gemini segure a função por
// muito tempo. Configurável via GEMINI_TIMEOUT_MS.
const TIMEOUT_IA_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 15_000;

const URL_BASE_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Cadeia de modelos, na ordem de tentativa. O primeiro é o mais leve e barato
// (alinhado à cota gratuita); os seguintes cobrem a indisponibilidade dele.
// Mantenha a cadeia curta: cada modelo pode consumir o timeout inteiro, e o
// `maxDuration` da função é de 60s (2 modelos x 15s cabem com folga).
const MODELOS_PADRAO = ["gemini-3.5-flash-lite", "gemini-3.6-flash"];

// 1 tentativa + 1 retry por modelo, com uma espera curta entre elas.
const TENTATIVAS_POR_MODELO = 2;
const ESPERA_ENTRE_TENTATIVAS_MS = 300;

// Repetir só faz sentido quando o provedor está sobrecarregado ou limitando o
// uso: erros de requisição (400/401/403/404) repetiriam o mesmo resultado.
const STATUS_RETENTAVEIS = new Set([429, 500, 502, 503, 504]);

// Sobrescrevível sem deploy: GEMINI_MODELOS="gemini-3.6-flash,outro-modelo".
function modelosConfigurados(): string[] {
  const configurados = process.env.GEMINI_MODELOS?.split(",")
    .map((modelo) => modelo.trim())
    .filter(Boolean);
  return configurados?.length ? configurados : MODELOS_PADRAO;
}

interface RespostaGeminiAPI {
  candidates?: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

// Resultado de uma tentativa isolada. A decisão de repetir ou trocar de modelo
// fica em `chamarIA`, mantendo `chamarModelo` com responsabilidade única.
type ResultadoChamada =
  | { tipo: "ok"; texto: string }
  | { tipo: "timeout" }
  | { tipo: "sem-conteudo" }
  | { tipo: "indisponivel" }
  | { tipo: "status"; status: number };

export interface OpcoesChamarIA {
  /** Implementação de fetch (padrão: fetch global). Injetável para testes. */
  fetchImpl?: typeof fetch;
  /** Timeout por tentativa em ms (padrão: TIMEOUT_IA_MS). Injetável para testes. */
  timeoutMs?: number;
  /** Cadeia de modelos (padrão: GEMINI_MODELOS ou MODELOS_PADRAO). */
  modelos?: string[];
  /** Espera entre tentativas do mesmo modelo (padrão: 300ms). */
  esperaMs?: number;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function descrever(resultado: ResultadoChamada): string {
  if (resultado.tipo === "timeout") return "timeout";
  if (resultado.tipo === "sem-conteudo") return "resposta sem conteúdo";
  if (resultado.tipo === "status") return `HTTP ${resultado.status}`;
  return "falha de rede";
}

function ehRetentavel(resultado: ResultadoChamada): boolean {
  return (
    resultado.tipo === "indisponivel" ||
    (resultado.tipo === "status" && STATUS_RETENTAVEIS.has(resultado.status))
  );
}

// Erro final quando a cadeia inteira se esgota. A mensagem é técnica (aparece
// nos logs da função); o handler a traduz em uma resposta amigável.
function erroFinal(ultimo: ResultadoChamada, modelos: string[]): Error {
  if (ultimo.tipo === "timeout") {
    return new ErroTimeoutIA("A IA demorou mais que o esperado.");
  }
  if (ultimo.tipo === "sem-conteudo") {
    return new ErroRespostaIA("resposta sem conteúdo utilizável.");
  }
  return new ErroIAIndisponivel(
    `IA indisponível (${descrever(ultimo)}) após tentar: ${modelos.join(", ")}.`,
  );
}

async function chamarModelo(
  modelo: string,
  prompt: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<ResultadoChamada> {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const response = await fetchImpl(
      // A chave viaja no header x-goog-api-key (não na query string), para não
      // vazar em logs de proxy/servidor.
      `${URL_BASE_GEMINI}/${modelo}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal: controlador.signal,
      },
    );

    if (!response.ok) {
      return { tipo: "status", status: response.status };
    }

    const data = (await response
      .json()
      .catch(() => null)) as RespostaGeminiAPI | null;
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof texto !== "string" || !texto.trim()) {
      return { tipo: "sem-conteudo" };
    }
    return { tipo: "ok", texto };
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") {
      return { tipo: "timeout" };
    }
    // Falha de rede/DNS entra no fluxo de indisponibilidade (retry + fallback),
    // em vez de estourar como um erro inesperado da aplicação.
    return { tipo: "indisponivel" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function chamarIA(
  prompt: string,
  opcoes: OpcoesChamarIA = {},
): Promise<string> {
  const fetchImpl = opcoes.fetchImpl ?? fetch;
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_IA_MS;
  const esperaMs = opcoes.esperaMs ?? ESPERA_ENTRE_TENTATIVAS_MS;
  const modelos = opcoes.modelos?.length
    ? opcoes.modelos
    : modelosConfigurados();

  let ultimo: ResultadoChamada = { tipo: "indisponivel" };

  for (const [indice, modelo] of modelos.entries()) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_MODELO; tentativa++) {
      const resultado = await chamarModelo(modelo, prompt, fetchImpl, timeoutMs);
      if (resultado.tipo === "ok") return resultado.texto;

      ultimo = resultado;

      // Erro de requisição ou resposta sem conteúdo não melhoram ao repetir o
      // mesmo modelo: passa para o próximo, se houver.
      if (!ehRetentavel(resultado)) break;

      if (tentativa < TENTATIVAS_POR_MODELO) {
        await esperar(esperaMs);
      }
    }

    if (indice < modelos.length - 1) {
      console.warn(
        `[ia] ${modelo} falhou (${descrever(ultimo)}) — tentando o próximo modelo.`,
      );
    }
  }

  throw erroFinal(ultimo, modelos);
}
