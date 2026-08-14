import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarCotaAnalises } from "./usoApi";

const obterIdSessaoMock = vi.hoisted(() => vi.fn());

vi.mock("./analisarApi", () => ({
  obterIdSessao: obterIdSessaoMock,
}));

function respostaFalsa(status: number, corpo: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as unknown as Response;
}

const ID_SESSAO = "11111111-2222-3333-4444-555555555555";

afterEach(() => {
  vi.unstubAllGlobals();
  obterIdSessaoMock.mockReset();
});

describe("buscarCotaAnalises", () => {
  it("retorna a cota validada e anexa o sessaoId na URL", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        respostaFalsa(200, {
          sessao: { usado: 2, limite: 5, restante: 3 },
          global: { usado: 42, limite: 100, restante: 58 },
          renovaEm: "2026-08-08T00:00:00.000Z",
          renovaEmGlobal: "2026-08-09T00:00:00.000Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    obterIdSessaoMock.mockResolvedValue(ID_SESSAO);

    const cota = await buscarCotaAnalises();

    expect(cota?.sessao?.restante).toBe(3);
    expect(cota?.global?.usado).toBe(42);
    expect(cota?.renovaEm).toBe("2026-08-08T00:00:00.000Z");
    expect(cota?.renovaEmGlobal).toBe("2026-08-09T00:00:00.000Z");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      `sessaoId=${ID_SESSAO}`,
    );
  });

  it("não anexa sessaoId quando não há sessão anônima", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        respostaFalsa(200, {
          sessao: null,
          global: null,
          renovaEm: null,
          renovaEmGlobal: null,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    obterIdSessaoMock.mockResolvedValue(null);

    await buscarCotaAnalises();

    expect(String(fetchMock.mock.calls[0][0])).not.toContain("sessaoId");
  });

  it("retorna null quando a resposta não é ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaFalsa(500, {})));
    obterIdSessaoMock.mockResolvedValue(null);

    expect(await buscarCotaAnalises()).toBeNull();
  });

  it("retorna null quando o fetch falha (rede indisponível)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    obterIdSessaoMock.mockResolvedValue(null);

    expect(await buscarCotaAnalises()).toBeNull();
  });

  it("retorna null quando o corpo tem shape inesperado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respostaFalsa(200, { sessao: { bizarro: 1 } })),
    );
    obterIdSessaoMock.mockResolvedValue(ID_SESSAO);

    expect(await buscarCotaAnalises()).toBeNull();
  });

  it("retorna null quando a renovação global tem shape inesperado", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaFalsa(200, {
          sessao: { usado: 1, limite: 5, restante: 4 },
          global: { usado: 10, limite: 100, restante: 90 },
          renovaEm: "2026-08-08T00:00:00.000Z",
          renovaEmGlobal: 12345,
        }),
      ),
    );
    obterIdSessaoMock.mockResolvedValue(ID_SESSAO);

    expect(await buscarCotaAnalises()).toBeNull();
  });
});
