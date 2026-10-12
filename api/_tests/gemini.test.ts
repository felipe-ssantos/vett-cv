// @vitest-environment node
// O módulo usa fetch e timers injetáveis — testado em ambiente node com fakes.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ErroIAIndisponivel,
  ErroRespostaIA,
  ErroTimeoutIA,
  chamarIA,
} from "../gemini.js";

const MODELO_A = "modelo-a";
const MODELO_B = "modelo-b";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function respostaGeminiOk(texto: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: texto }] } }],
    }),
  } as unknown as Response;
}

function respostaSemCandidates(): Response {
  return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
}

function respostaErro(status: number): Response {
  return { ok: false, status } as unknown as Response;
}

// fetch que nunca resolve: só é encerrado pelo AbortController.
function fetchQueNuncaResponde() {
  return vi.fn(
    (_url: unknown, init: { signal?: AbortSignal | null } | undefined) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const erro = new Error("The operation was aborted.");
          erro.name = "AbortError";
          reject(erro);
        });
      }),
  );
}

function urlDaChamada(fetchImpl: { mock: { calls: unknown[][] } }, indice: number) {
  return String(fetchImpl.mock.calls[indice]?.[0]);
}

describe("chamarIA — timeout explícito (P2)", () => {
  it("lança ErroTimeoutIA quando a IA não responde dentro do teto", async () => {
    vi.useFakeTimers();

    const fetchImpl = fetchQueNuncaResponde();

    const promessa = chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A],
    });

    // Anexa o handler de rejeição ANTES de disparar o abort, para a rejeição
    // nunca ficar órfã (unhandled rejection).
    const expectativa = expect(promessa).rejects.toBeInstanceOf(ErroTimeoutIA);

    // Avança o relógio além do timeout para disparar o abort.
    await vi.advanceTimersByTimeAsync(5001);

    await expectativa;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("não repete o mesmo modelo após timeout, mas tenta o próximo", async () => {
    const fetchImpl = fetchQueNuncaResponde();

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 20,
        modelos: [MODELO_A, MODELO_B],
      }),
    ).rejects.toBeInstanceOf(ErroTimeoutIA);

    // Um timeout não é retentável no mesmo modelo (ele está lento, não
    // instável): cada modelo é tentado uma única vez, na ordem da cadeia.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urlDaChamada(fetchImpl, 0)).toContain(MODELO_A);
    expect(urlDaChamada(fetchImpl, 1)).toContain(MODELO_B);
  });

  it("retorna o texto quando a IA responde dentro do prazo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respostaGeminiOk('{"scoreMatch": 80}'));

    const texto = await chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A],
    });

    expect(texto).toBe('{"scoreMatch": 80}');
    // O prompt viaja no corpo; a chave fica no header, nunca na query string.
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(String(init.body)).toContain("prompt");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      process.env.GEMINI_API_KEY ?? "",
    );
  });

  it("usa responseMimeType application/json na chamada", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respostaGeminiOk("{}"));

    await chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A],
    });

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const corpo = JSON.parse(String(init.body)) as {
      generationConfig: { responseMimeType: string };
    };
    expect(corpo.generationConfig.responseMimeType).toBe("application/json");
  });
});

describe("chamarIA — retry e fallback de modelo", () => {
  it("repete o mesmo modelo quando ele responde 503 e devolve o texto na sequência", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respostaErro(503))
      .mockResolvedValueOnce(respostaGeminiOk('{"scoreMatch": 70}'));

    const texto = await chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A],
      esperaMs: 0,
    });

    expect(texto).toBe('{"scoreMatch": 70}');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urlDaChamada(fetchImpl, 1)).toContain(MODELO_A);
  });

  it("cai para o próximo modelo quando o primeiro esgota as tentativas", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respostaErro(503))
      .mockResolvedValueOnce(respostaErro(503))
      .mockResolvedValueOnce(respostaGeminiOk('{"scoreMatch": 90}'));

    const texto = await chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A, MODELO_B],
      esperaMs: 0,
    });

    expect(texto).toBe('{"scoreMatch": 90}');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(urlDaChamada(fetchImpl, 2)).toContain(MODELO_B);
  });

  it("não repete um erro não retentável (400) e passa para o próximo modelo", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respostaErro(400))
      .mockResolvedValueOnce(respostaGeminiOk('{"scoreMatch": 60}'));

    const texto = await chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
      modelos: [MODELO_A, MODELO_B],
      esperaMs: 0,
    });

    expect(texto).toBe('{"scoreMatch": 60}');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(urlDaChamada(fetchImpl, 1)).toContain(MODELO_B);
  });

  it("lança ErroIAIndisponivel quando toda a cadeia responde 503", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respostaErro(503));

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 5000,
        modelos: [MODELO_A, MODELO_B],
        esperaMs: 0,
      }),
    ).rejects.toBeInstanceOf(ErroIAIndisponivel);

    // 2 tentativas por modelo, na ordem da cadeia.
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("desiste de tentar quando o orçamento total da cadeia se esgota", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respostaErro(503));

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 5000,
        modelos: [MODELO_A, MODELO_B],
        esperaMs: 0,
        orcamentoMs: 0,
      }),
    ).rejects.toBeInstanceOf(ErroIAIndisponivel);

    // Melhor devolver o último erro conhecido do que estourar o maxDuration.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("trata falha de rede como indisponibilidade (com retry)", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 5000,
        modelos: [MODELO_A],
        esperaMs: 0,
      }),
    ).rejects.toBeInstanceOf(ErroIAIndisponivel);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("respeita a cadeia configurada em GEMINI_MODELOS", async () => {
    vi.stubEnv("GEMINI_MODELOS", " modelo-configurado , outro-modelo ");

    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respostaGeminiOk('{"scoreMatch": 50}'));

    const texto = await chamarIA("prompt", { fetchImpl, timeoutMs: 5000 });

    expect(texto).toBe('{"scoreMatch": 50}');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(urlDaChamada(fetchImpl, 0)).toContain("modelo-configurado");
  });
});

describe("chamarIA — resposta sem conteúdo utilizável", () => {
  it("lança ErroRespostaIA quando a resposta vem sem candidates", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respostaSemCandidates());

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 5000,
        modelos: [MODELO_A, MODELO_B],
        esperaMs: 0,
      }),
    ).rejects.toBeInstanceOf(ErroRespostaIA);

    // Resposta vazia não melhora repetindo: cada modelo é tentado uma vez.
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("lança ErroRespostaIA quando o texto vem vazio", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(respostaGeminiOk("   "));

    await expect(
      chamarIA("prompt", {
        fetchImpl,
        timeoutMs: 5000,
        modelos: [MODELO_A],
        esperaMs: 0,
      }),
    ).rejects.toBeInstanceOf(ErroRespostaIA);
  });
});
