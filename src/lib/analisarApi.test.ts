import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarAnalise } from "./analisarApi";

const getSessionMock = vi.hoisted(() => vi.fn());

vi.mock("./supabaseClient", () => ({
  supabase: { auth: { getSession: getSessionMock } },
}));

function respostaFalsa(status: number, corpo: unknown, json = true) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (nome: string) =>
        nome.toLowerCase() === "content-type"
          ? json
            ? "application/json"
            : "text/html"
          : null,
    },
    json: async () => corpo,
  } as unknown as Response;
}

const RESPOSTA_SUCESSO = {
  analise: {
    scoreMatch: 90,
    matchPorCategoria: {
      skills_tecnicas: 80,
      ferramentas: 70,
      experiencia: 60,
      soft_skills: 50,
    },
    keywordsPresentes: [],
    keywordsFaltando: [],
    pontosFortes: [],
    sugestoesAjuste: [],
    resumoIA: "resumo",
    dicaFinal: "dica",
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  getSessionMock.mockReset();
});

describe("enviarAnalise — limite de análises (429)", () => {
  it("usa a mensagem do servidor quando o 429 traz JSON de erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respostaFalsa(429, {
          erro: "Você atingiu o limite de 5 análises por janela de 3 horas neste navegador. A cota renova automaticamente.",
        }),
      ),
    );
    getSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(enviarAnalise(new FormData())).rejects.toThrow(
      "Você atingiu o limite de 5 análises por janela de 3 horas",
    );
  });

  it("mostra mensagem genérica quando o 429 não traz JSON de erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respostaFalsa(429, null, false)));
    getSessionMock.mockResolvedValue({ data: { session: null } });

    await expect(enviarAnalise(new FormData())).rejects.toThrow(
      "Limite de análises atingido",
    );
  });
});

describe("enviarAnalise — sessão anônima", () => {
  it("anexa sessaoId no FormData quando existe sessão anônima", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => RESPOSTA_SUCESSO,
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    getSessionMock.mockResolvedValue({
      data: {
        session: { user: { id: "11111111-2222-3333-4444-555555555555" } },
      },
    });

    const formData = new FormData();
    await enviarAnalise(formData);

    const enviado = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(enviado.get("sessaoId")).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("não anexa sessaoId quando não há sessão anônima", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => RESPOSTA_SUCESSO,
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const formData = new FormData();
    await enviarAnalise(formData);

    const enviado = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(enviado.get("sessaoId")).toBeNull();
  });
});
