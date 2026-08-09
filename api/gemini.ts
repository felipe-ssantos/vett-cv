// Chamada à API do Gemini (Google). Módulo com dependências injetáveis
// (`fetchImpl` e `timeoutMs`) para ser testável isoladamente: o timeout com
// AbortController e o mapeamento de abort -> ErroTimeoutIA podem ser cobertos
// sem rede real.

export class ErroTimeoutIA extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroTimeoutIA";
  }
}

// Timeout explícito da chamada à IA (AbortController). A Vercel já impõe
// `maxDuration` (60s); este teto evita que uma resposta lenta da Gemini
// segure a função por muito tempo. Configurável via GEMINI_TIMEOUT_MS.
const TIMEOUT_IA_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 15_000;

const URL_GEMINI =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";

interface RespostaGeminiAPI {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

export interface OpcoesChamarIA {
  /** Implementação de fetch (padrão: fetch global). Injetável para testes. */
  fetchImpl?: typeof fetch;
  /** Timeout em ms (padrão: TIMEOUT_IA_MS). Injetável para testes. */
  timeoutMs?: number;
}

export async function chamarIA(
  prompt: string,
  opcoes: OpcoesChamarIA = {},
): Promise<string> {
  const fetchImpl = opcoes.fetchImpl ?? fetch;
  const timeoutMs = opcoes.timeoutMs ?? TIMEOUT_IA_MS;

  // Timeout explícito: aborta o fetch se a IA não responder dentro do teto,
  // liberando a função e a cota.
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    const response = await fetchImpl(
      // A chave viaja no header x-goog-api-key (não na query string), para não
      // vazar em logs de proxy/servidor.
      URL_GEMINI,
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
      throw new Error(`Erro na chamada da IA: ${response.status}`);
    }

    const data = (await response.json()) as RespostaGeminiAPI;
    return data.candidates[0].content.parts[0].text;
  } catch (erro) {
    if (erro instanceof Error && erro.name === "AbortError") {
      throw new ErroTimeoutIA("A IA demorou mais que o esperado.");
    }
    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}
