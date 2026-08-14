// @vitest-environment node
// Handler POST /api/analisar com formidable, Gemini e Supabase mockados —
// cobre validações de entrada, limites de cota (429/503) e os fluxos de
// sucesso/erro sem rede real.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { LIMITE_ANALISES_POR_SESSAO } from "./limites.js";
import handler from "./analisar.js";

const formidableMock = vi.hoisted(() => ({
  parse: vi.fn(async () => [{}, {}]),
}));

const chamarIA = vi.hoisted(() => vi.fn());
const montarPromptComExtracao = vi.hoisted(() => vi.fn(() => "prompt"));
const montarPromptSoAnalise = vi.hoisted(() => vi.fn(() => "prompt"));

// A MESMA classe de erro exportada pelo mock: o handler usa `instanceof`.
const ErroTimeoutIA = vi.hoisted(() => {
  return class ErroTimeoutIA extends Error {
    constructor(mensagem: string) {
      super(mensagem);
      this.name = "ErroTimeoutIA";
    }
  };
});

// Cliente Supabase fake: `incrementarUso` chama `supabaseAdmin.rpc(...)`.
const rpc = vi.hoisted(() => vi.fn());

vi.mock("formidable", () => ({
  default: () => ({ parse: formidableMock.parse }),
}));

vi.mock("./gemini.js", () => ({
  ErroTimeoutIA,
  chamarIA,
}));

vi.mock("./prompts.js", () => ({
  montarPromptComExtracao,
  montarPromptSoAnalise,
}));

vi.mock("./limites.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./limites.js")>();
  return {
    ...original,
    criarClienteSupabaseAdmin: () => ({ rpc }),
  };
});

const ID_SESSAO = "11111111-2222-3333-4444-555555555555";

// O mock do formidable devolve estes campos/arquivos na próxima chamada.
function definirEntrada(
  campos: Record<string, string[]>,
  arquivos: Record<string, Array<Record<string, unknown>>> = {},
) {
  formidableMock.parse.mockResolvedValueOnce([campos, arquivos]);
}

function criarRequisicao(): VercelRequest {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "203.0.113.10" },
    socket: {},
  } as unknown as VercelRequest;
}

function criarResposta() {
  const corpo: { status?: number; dados?: unknown } = {};
  const res = {
    status(codigo: number) {
      corpo.status = codigo;
      return res;
    },
    json(dados: unknown) {
      corpo.dados = dados;
      return res;
    },
  } as unknown as VercelResponse;
  return { res, corpo };
}

function analiseValida() {
  return {
    scoreMatch: 85,
    matchPorCategoria: {
      skills_tecnicas: 90,
      ferramentas: 80,
      experiencia: 75,
      soft_skills: 70,
    },
    keywordsPresentes: ["SQL"],
    keywordsFaltando: ["Python"],
    pontosFortes: ["Boa base em SQL"],
    sugestoesAjuste: ["Adicionar projetos com Python"],
    resumoIA: "Perfil alinhado com a vaga.",
    dicaFinal: "Destaque seus projetos.",
  };
}

beforeEach(() => {
  // Padrão: todas as chaves incrementam para 1 (dentro dos limites).
  rpc.mockResolvedValue({ data: 1, error: null });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/analisar — validações de entrada", () => {
  it("rejeita método diferente de POST com 405", async () => {
    const { res, corpo } = criarResposta();

    await handler({ method: "GET" } as VercelRequest, res);

    expect(corpo.status).toBe(405);
  });

  it("rejeita com 400 quando um campo excede o teto de caracteres, sem consumir cota", async () => {
    definirEntrada({ descricaoVaga: ["x".repeat(8001)] });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain("excede o limite");
    expect(rpc).not.toHaveBeenCalled();
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("rejeita com 400 arquivo vazio", async () => {
    definirEntrada(
      {},
      {
        arquivo: [
          {
            size: 0,
            filepath: "/tmp/vazio.pdf",
            originalFilename: "vazio.pdf",
            mimetype: "application/pdf",
          },
        ],
      },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toBe(
      "O arquivo enviado está vazio.",
    );
  });

  it("rejeita com 400 arquivo acima de 4 MB", async () => {
    definirEntrada(
      {},
      {
        arquivo: [
          {
            size: 4 * 1024 * 1024 + 1,
            filepath: "/tmp/grande.pdf",
            originalFilename: "grande.pdf",
            mimetype: "application/pdf",
          },
        ],
      },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain("4 MB");
  });

  it("rejeita com 400 quando não há texto de currículo, sem consumir cota", async () => {
    definirEntrada({ descricaoVaga: ["vaga de dados"] });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Nenhum texto de currículo",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/analisar — limites de uso", () => {
  it("bloqueia com 429 quando a cota da sessão esgota, sem chamar a IA", async () => {
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });
    rpc.mockImplementation(async (_fn: string, params: { p_chave: string }) => {
      if (params.p_chave.startsWith("sessao:")) {
        return { data: LIMITE_ANALISES_POR_SESSAO + 1, error: null };
      }
      return { data: 1, error: null };
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(429);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "limite de 5 análises",
    );
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("bloqueia com 503 quando o contador global está indisponível (fail-closed)", async () => {
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });
    rpc.mockImplementation(async (_fn: string, params: { p_chave: string }) => {
      if (params.p_chave.startsWith("global:")) {
        return { data: null, error: { message: "fora do ar" } };
      }
      return { data: 1, error: null };
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(503);
    expect((corpo.dados as { erro: string }).erro).toContain("indisponível");
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("bloqueia com 429 quando o teto global do dia foi atingido", async () => {
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });
    rpc.mockImplementation(async (_fn: string, params: { p_chave: string }) => {
      if (params.p_chave.startsWith("global:")) {
        return { data: 101, error: null };
      }
      return { data: 1, error: null };
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(429);
    expect((corpo.dados as { erro: string }).erro).toContain("limite diário");
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("rejeita com 400 quando a descrição da vaga está vazia (após passar nos limites)", async () => {
    definirEntrada({ curriculoTexto: ["Currículo com SQL"] });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toBe(
      "Cole a descrição da vaga.",
    );
    expect(chamarIA).not.toHaveBeenCalled();
  });
});

describe("POST /api/analisar — fluxos de sucesso", () => {
  it("retorna 200 com vaga e análise no fluxo completo (currículo colado)", async () => {
    const respostaIA = {
      vaga: {
        titulo: "Analista de Dados",
        empresa: null,
        hardSkills: ["SQL"],
        softSkills: ["Comunicação"],
        senioridade: "Pleno",
      },
      analise: analiseValida(),
    };
    chamarIA.mockResolvedValue(JSON.stringify(respostaIA));
    definirEntrada({
      curriculoTexto: ["Currículo com SQL e Python"],
      descricaoVaga: ["Vaga de analista de dados"],
      sessaoId: [ID_SESSAO],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as {
      vaga: { titulo: string };
      analise: { scoreMatch: number };
    };
    expect(dados.vaga.titulo).toBe("Analista de Dados");
    expect(dados.analise.scoreMatch).toBe(85);
    // Incrementa sessão, IP e global (3 chaves) antes de chamar a IA.
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(montarPromptComExtracao).toHaveBeenCalledWith(
      "Currículo com SQL e Python",
      "Vaga de analista de dados",
    );
  });

  it("retorna 200 na reanálise com vagaExistente (sem extração de vaga)", async () => {
    chamarIA.mockResolvedValue(JSON.stringify(analiseValida()));
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      vagaExistente: [
        JSON.stringify({
          titulo: "Analista de Dados",
          descricaoCompleta: "Vaga com SQL",
          hardSkills: ["SQL"],
          softSkills: [],
          senioridade: "Pleno",
        }),
      ],
      sessaoId: [ID_SESSAO],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as {
      vaga?: unknown;
      analise: { scoreMatch: number };
    };
    expect(dados.analise.scoreMatch).toBe(85);
    expect(dados.vaga).toBeUndefined();
    expect(montarPromptSoAnalise).toHaveBeenCalled();
  });
});

describe("POST /api/analisar — falhas da IA", () => {
  it("retorna 502 quando a IA não devolve um JSON válido", async () => {
    chamarIA.mockResolvedValue("isto não é JSON");
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "resposta inválida",
    );
  });

  it("retorna 502 quando o JSON da IA tem shape inválido", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: { titulo: "X" }, analise: { scoreMatch: "alto" } }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
  });

  it("retorna 504 quando a IA estoura o timeout", async () => {
    chamarIA.mockRejectedValue(new ErroTimeoutIA("demorou demais"));
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(504);
    expect((corpo.dados as { erro: string }).erro).toContain("demorou demais");
  });
});
