// @vitest-environment node
// Handler POST /api/analisar com formidable, Gemini e Supabase mockados —
// cobre validações de entrada, limites de cota (429/503), extração de arquivo
// (PDF/DOCX com arquivos temporários reais e pdf-parse/mammoth mockados) e os
// fluxos de sucesso/erro sem rede real.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

// Extração de arquivo: os parsers reais são substituídos por mocks (a leitura
// do arquivo em si usa o fs real, com arquivos temporários).
const pdfParse = vi.hoisted(() => vi.fn());
const mammothExtractRawText = vi.hoisted(() => vi.fn());

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

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({ default: pdfParse }));

vi.mock("mammoth", () => ({
  default: { extractRawText: mammothExtractRawText },
}));

const ID_SESSAO = "11111111-2222-3333-4444-555555555555";

// O mock do formidable devolve estes campos/arquivos na próxima chamada.
function definirEntrada(
  campos: Record<string, string[]>,
  arquivos: Record<string, Array<Record<string, unknown>>> = {},
) {
  formidableMock.parse.mockResolvedValueOnce([campos, arquivos]);
}

function criarRequisicao(
  headers: Record<string, string | string[] | undefined> = {
    "x-forwarded-for": "203.0.113.10",
  },
): VercelRequest {
  return {
    method: "POST",
    headers,
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

function vagaValida() {
  return {
    titulo: "Analista de Dados",
    empresa: null,
    hardSkills: ["SQL"],
    softSkills: ["Comunicação"],
    senioridade: "Pleno",
  };
}

// Um arquivo de currículo válido para o formidable (passa nas checagens de
// tamanho) apontando para um arquivo temporário real.
function arquivoDeCurriculo(
  caminho: string,
  tamanho: number,
  nome = "curriculo.pdf",
  mimetype = "application/pdf",
) {
  return {
    filepath: caminho,
    originalFilename: nome,
    mimetype,
    size: tamanho,
  };
}

let dirTemp: string;

beforeEach(() => {
  // Padrão: todas as chaves incrementam para 1 (dentro dos limites).
  rpc.mockResolvedValue({ data: 1, error: null });
  montarPromptComExtracao.mockReturnValue("prompt");
  montarPromptSoAnalise.mockReturnValue("prompt");
  dirTemp = mkdtempSync(join(tmpdir(), "vett-analisar-"));
});

afterEach(() => {
  vi.resetAllMocks();
  rmSync(dirTemp, { recursive: true, force: true });
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

  it("bloqueia com 429 quando a cota do IP esgota (sessão dentro do limite)", async () => {
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });
    rpc.mockImplementation(async (_fn: string, params: { p_chave: string }) => {
      if (params.p_chave.startsWith("ip:")) {
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

  it("não aplica o limite por IP quando não há IP disponível", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: analiseValida() }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });

    const { res, corpo } = criarResposta();
    // Sem x-forwarded-for nem remoteAddress: não há IP para hashear.
    await handler(criarRequisicao({}), res);

    expect(corpo.status).toBe(200);
    // Sessão + global (2 chaves) — sem a chave de IP.
    expect(rpc).toHaveBeenCalledTimes(2);
    const chaves = rpc.mock.calls.map((chamada) => chamada[1].p_chave);
    expect(chaves.some((chave) => chave.startsWith("ip:"))).toBe(false);
  });

  it("fail-open quando o contador devolve dado não numérico → 503 no teto global", async () => {
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });
    // Sessão/IP falham em silêncio (fail-open); o global indisponível bloqueia.
    rpc.mockResolvedValue({ data: "não-número", error: null });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(503);
    expect((corpo.dados as { erro: string }).erro).toContain("indisponível");
  });

  it("fail-open sem chave de serviço: contador indisponível bloqueia com 503 (teto global)", async () => {
    // O cliente admin é criado no load do módulo. Recarrega o handler com
    // `criarClienteSupabaseAdmin` devolvendo null (sem SUPABASE_SERVICE_ROLE_KEY)
    // para cobrir o guard `if (!supabaseAdmin) return null` (fail-open).
    vi.resetModules();
    vi.doMock("./limites.js", async (importOriginal) => {
      const original = await importOriginal<typeof import("./limites.js")>();
      return { ...original, criarClienteSupabaseAdmin: () => null };
    });
    const handlerSemCliente = (await import("./analisar.js")).default;

    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
      sessaoId: [ID_SESSAO],
    });
    const { res, corpo } = criarResposta();
    await handlerSemCliente(criarRequisicao(), res);

    // Sessão/IP falham em silêncio (fail-open); o teto global indisponível
    // bloqueia (fail-closed).
    expect(corpo.status).toBe(503);
    expect((corpo.dados as { erro: string }).erro).toContain("indisponível");
  });
});

describe("POST /api/analisar — extração de PDF", () => {
  it("extrai o texto do PDF pela assinatura de conteúdo e retorna 200", async () => {
    const caminho = join(dirTemp, "curriculo.pdf");
    writeFileSync(caminho, Buffer.from("%PDF-1.4\nconteúdo simulado"));
    pdfParse.mockResolvedValue({ text: "Currículo extraído do PDF" });
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: analiseValida() }),
    );
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 1024)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as { analise: { scoreMatch: number } };
    expect(dados.analise.scoreMatch).toBe(85);
    // O texto que alimenta o prompt vem da extração, não do campo colado.
    expect(montarPromptComExtracao).toHaveBeenCalledWith(
      "Currículo extraído do PDF",
      "Vaga de dados",
    );
  });

  it("usa a extensão como fallback quando o conteúdo não tem assinatura", async () => {
    const caminho = join(dirTemp, "curriculo.pdf");
    writeFileSync(caminho, "conteúdo sem assinatura de PDF");
    pdfParse.mockResolvedValue({ text: "Texto via extensão" });
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: analiseValida() }),
    );
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 1024)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    expect(montarPromptComExtracao).toHaveBeenCalledWith(
      "Texto via extensão",
      "Vaga de dados",
    );
  });

  it("rejeita PDF ilegível com 400, sem consumir cota", async () => {
    const caminho = join(dirTemp, "corrompido.pdf");
    writeFileSync(caminho, Buffer.from("%PDF-"));
    pdfParse.mockRejectedValue(new Error("formato inválido"));
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 1024)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Não foi possível ler o PDF",
    );
    expect(rpc).not.toHaveBeenCalled();
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("rejeita com 400 quando o PDF não tem texto extraível", async () => {
    const caminho = join(dirTemp, "imagem.pdf");
    writeFileSync(caminho, Buffer.from("%PDF-1.4"));
    pdfParse.mockResolvedValue({ text: "   " });
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 1024)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Nenhum texto de currículo",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejeita com 400 quando o texto extraído excede o teto de caracteres", async () => {
    const caminho = join(dirTemp, "enorme.pdf");
    writeFileSync(caminho, Buffer.from("%PDF-1.4"));
    pdfParse.mockResolvedValue({ text: "a".repeat(8001) });
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 1024)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "excede o limite de 8000",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/analisar — extração de DOCX e formatos", () => {
  it("extrai o texto do DOCX pela assinatura ZIP e retorna 200", async () => {
    const caminho = join(dirTemp, "curriculo.docx");
    // DOCX é um ZIP: assinatura "PK\x03\x04".
    writeFileSync(caminho, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]));
    mammothExtractRawText.mockResolvedValue({ value: "Texto do DOCX" });
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: analiseValida() }),
    );
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      {
        arquivo: [
          arquivoDeCurriculo(
            caminho,
            2048,
            "curriculo.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ),
        ],
      },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    expect(montarPromptComExtracao).toHaveBeenCalledWith(
      "Texto do DOCX",
      "Vaga de dados",
    );
  });

  it("rejeita DOCX ilegível com 400", async () => {
    const caminho = join(dirTemp, "corrompido.docx");
    writeFileSync(caminho, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    mammothExtractRawText.mockRejectedValue(new Error("arquivo inválido"));
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      { arquivo: [arquivoDeCurriculo(caminho, 2048)] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Não foi possível ler o DOCX",
    );
    expect(chamarIA).not.toHaveBeenCalled();
  });

  it("rejeita .doc legado (OLE2) com mensagem clara", async () => {
    const caminho = join(dirTemp, "curriculo.doc");
    // Assinatura OLE2: "D0 CF 11 E0".
    writeFileSync(
      caminho,
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    );
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      {
        arquivo: [
          arquivoDeCurriculo(caminho, 1024, "curriculo.doc", "application/msword"),
        ],
      },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Arquivos .doc antigos não são suportados",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejeita formato não suportado com 400", async () => {
    const caminho = join(dirTemp, "curriculo.txt");
    writeFileSync(caminho, "texto simples");
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      {
        arquivo: [
          arquivoDeCurriculo(caminho, 1024, "curriculo.txt", "text/plain"),
        ],
      },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Formato de arquivo não suportado",
    );
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejeita com 400 quando o arquivo não tem nome, mimetype nem assinatura conhecida", async () => {
    const caminho = join(dirTemp, "arquivo.bin");
    writeFileSync(caminho, "conteúdo sem assinatura");
    definirEntrada(
      { descricaoVaga: ["Vaga de dados"] },
      // Sem originalFilename/mimetype: o fallback de extensão não encontra
      // nada e a assinatura de conteúdo também não casa.
      { arquivo: [{ filepath: caminho, size: 1024 }] },
    );

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(400);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "Formato de arquivo não suportado",
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/analisar — fluxos de sucesso", () => {
  it("retorna 200 com vaga e análise no fluxo completo (currículo colado)", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: analiseValida() }),
    );
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

  it("aceita empresa e senioridade como strings na vaga extraída", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({
        vaga: {
          ...vagaValida(),
          empresa: "Empresa X",
          senioridade: null,
        },
        analise: analiseValida(),
      }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de analista de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as { vaga: { empresa: string | null } };
    expect(dados.vaga.empresa).toBe("Empresa X");
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

  it("retorna 502 quando a resposta não traz os dados da vaga", async () => {
    chamarIA.mockResolvedValue(JSON.stringify({ analise: analiseValida() }));
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
  });

  it("retorna 502 quando scoreMatch está fora do intervalo 0-100", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({
        vaga: vagaValida(),
        analise: { ...analiseValida(), scoreMatch: 101 },
      }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain("0-100");
  });

  it("retorna 502 quando scoreMatch não é um número", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({
        vaga: vagaValida(),
        analise: { ...analiseValida(), scoreMatch: "85" },
      }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "não é um número",
    );
  });

  it("retorna 502 quando a análise não é um objeto JSON", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: "texto" }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "não é um objeto JSON válido",
    );
  });

  it("retorna 502 quando matchPorCategoria está ausente", async () => {
    const { matchPorCategoria, ...semCategoria } = analiseValida();
    void matchPorCategoria;
    chamarIA.mockResolvedValue(
      JSON.stringify({ vaga: vagaValida(), analise: semCategoria }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "matchPorCategoria",
    );
  });

  it("retorna 502 quando um array de keywords contém item não-string", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({
        vaga: vagaValida(),
        analise: { ...analiseValida(), keywordsPresentes: ["SQL", 42] },
      }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
  });

  it("retorna 502 quando resumoIA está vazio", async () => {
    chamarIA.mockResolvedValue(
      JSON.stringify({
        vaga: vagaValida(),
        analise: { ...analiseValida(), resumoIA: "   " },
      }),
    );
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(502);
  });

  it("retorna 502 quando a IA não devolve JSON válido na reanálise (vagaExistente)", async () => {
    chamarIA.mockResolvedValue("isto não é JSON");
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

    expect(corpo.status).toBe(502);
    expect((corpo.dados as { erro: string }).erro).toContain(
      "A IA não retornou um JSON válido",
    );
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

  it("retorna 500 quando a IA falha com erro inesperado", async () => {
    chamarIA.mockRejectedValue(new Error("falha inesperada no Gemini"));
    definirEntrada({
      curriculoTexto: ["Currículo com SQL"],
      descricaoVaga: ["Vaga de dados"],
    });

    const { res, corpo } = criarResposta();
    await handler(criarRequisicao(), res);

    expect(corpo.status).toBe(500);
    expect((corpo.dados as { erro: string }).erro).toBe(
      "Falha ao processar a análise.",
    );
  });
});
