// @vitest-environment node
// O módulo usa fetch e timers injetáveis — testado em ambiente node com fakes.
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErroTimeoutIA, chamarIA } from "./gemini.js";

afterEach(() => {
  vi.useRealTimers();
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

function respostaErro(status: number): Response {
  return { ok: false, status } as unknown as Response;
}

describe("chamarIA — timeout explícito (P2)", () => {
  it("lança ErroTimeoutIA quando a IA não responde dentro do teto", async () => {
    vi.useFakeTimers();

    // fetch que nunca resolve: só é encerrado pelo AbortController.
    const fetchImpl = vi.fn(
      (_url: unknown, init: { signal?: AbortSignal | null } | undefined) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const erro = new Error("The operation was aborted.");
            erro.name = "AbortError";
            reject(erro);
          });
        }),
    );

    const promessa = chamarIA("prompt", {
      fetchImpl,
      timeoutMs: 5000,
    });

    // Anexa o handler de rejeição ANTES de disparar o abort, para a rejeição
    // nunca ficar órfã (unhandled rejection).
    const expectativa = expect(promessa).rejects.toBeInstanceOf(ErroTimeoutIA);

    // Avança o relógio além do timeout para disparar o abort.
    await vi.advanceTimersByTimeAsync(5001);

    await expectativa;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retorna o texto quando a IA responde dentro do prazo", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      respostaGeminiOk('{"scoreMatch": 80}'),
    );

    const texto = await chamarIA("prompt", { fetchImpl, timeoutMs: 5000 });

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

  it("propaga erros HTTP como Error genérico (sem vazar detalhes)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respostaErro(500));

    await expect(chamarIA("prompt", { fetchImpl, timeoutMs: 5000 })).rejects.toThrow(
      "Erro na chamada da IA: 500",
    );
  });
});

describe("chamarIA — geração de JSON da resposta", () => {
  it("usa responseMimeType application/json na chamada", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(respostaGeminiOk("{}"));

    await chamarIA("prompt", { fetchImpl, timeoutMs: 5000 });

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const corpo = JSON.parse(String(init.body)) as {
      generationConfig: { responseMimeType: string };
    };
    expect(corpo.generationConfig.responseMimeType).toBe("application/json");
  });
});
