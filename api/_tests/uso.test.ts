// @vitest-environment node
// Handler GET /api/uso com o cliente Supabase mockado — valida a composição
// dos contadores (sessão/IP/global) sem depender de rede ou banco.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { chavePorIp, dataDeHojeUtc, janelaAtualUtc } from "../limites.js";
import handler from "../uso.js";

// Mapa de contagens por chave do contador: null = serviço indisponível.
// Chaves ausentes contam como 0 (chave ainda não criada no banco).
const contagens = vi.hoisted(() => new Map<string, number | null>());

vi.mock("../limites.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../limites.js")>();
  return {
    ...original,
    criarClienteSupabaseAdmin: () => ({
      from: () => ({
        select: () => ({
          eq: (_coluna: string, chave: string) => ({
            maybeSingle: async () => {
              const valor = contagens.get(chave);
              if (valor === null) {
                return { data: null, error: { message: "indisponível" } };
              }
              return { data: { contagem: valor }, error: null };
            },
          }),
        }),
      }),
    }),
  };
});

const ID_SESSAO = "11111111-2222-3333-4444-555555555555";

function criarRequisicao({
  sessaoId,
  headers = {},
}: {
  sessaoId?: string | null;
  headers?: Record<string, string | string[] | undefined>;
} = {}): VercelRequest {
  return {
    method: "GET",
    query: sessaoId === undefined ? {} : { sessaoId },
    headers,
    socket: { remoteAddress: undefined },
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

afterEach(() => {
  contagens.clear();
});

describe("GET /api/uso — contadores de cota", () => {
  it("rejeita método diferente de GET com 405", async () => {
    const req = {
      method: "POST",
      query: {},
      headers: {},
    } as unknown as VercelRequest;
    const { res, corpo } = criarResposta();

    await handler(req, res);

    expect(corpo.status).toBe(405);
    expect(corpo.dados).toEqual({ erro: "Método não permitido" });
  });

  it("retorna o maior uso entre sessão e IP e o contador global", async () => {
    const janela = janelaAtualUtc();
    const hoje = dataDeHojeUtc();
    contagens.set(`sessao:${ID_SESSAO}:${janela}`, 3);
    contagens.set(`global:${hoje}`, 42);

    const req = criarRequisicao({
      sessaoId: ID_SESSAO,
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as {
      sessao: { usado: number; limite: number; restante: number };
      global: { usado: number; limite: number; restante: number };
      renovaEm: string;
      renovaEmGlobal: string;
    };
    // IP sem registro conta como 0 → o maior uso é o da sessão (3).
    expect(dados.sessao).toEqual({ usado: 3, limite: 5, restante: 2 });
    expect(dados.global.usado).toBe(42);
    expect(dados.global.restante).toBe(58);
    expect(typeof dados.renovaEm).toBe("string");
    // A renovação do teto global é a meia-noite UTC — sempre um ISO futuro.
    expect(dados.renovaEmGlobal).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("usa o contador do IP quando o sessaoId é inválido", async () => {
    const janela = janelaAtualUtc();
    const reqComIp = criarRequisicao({
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const chaveIp = chavePorIp(reqComIp, janela) ?? "";
    contagens.set(chaveIp, 4);

    const req = criarRequisicao({
      sessaoId: "id-invalido",
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    const dados = corpo.dados as { sessao: { usado: number } | null };
    expect(dados.sessao?.usado).toBe(4);
  });

  it("prioriza o maior uso quando sessão e IP divergem", async () => {
    const janela = janelaAtualUtc();
    const reqComIp = criarRequisicao({
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const chaveIp = chavePorIp(reqComIp, janela) ?? "";
    contagens.set(`sessao:${ID_SESSAO}:${janela}`, 1);
    contagens.set(chaveIp, 4);

    const req = criarRequisicao({
      sessaoId: ID_SESSAO,
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    const dados = corpo.dados as { sessao: { usado: number } | null };
    expect(dados.sessao?.usado).toBe(4);
  });

  it("mantém a sessão mesmo quando só o contador global falha", async () => {
    const janela = janelaAtualUtc();
    const hoje = dataDeHojeUtc();
    contagens.set(`sessao:${ID_SESSAO}:${janela}`, 2);
    contagens.set(`global:${hoje}`, null);

    const req = criarRequisicao({
      sessaoId: ID_SESSAO,
      headers: { "x-forwarded-for": "203.0.113.10" },
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    const dados = corpo.dados as { sessao: { usado: number } | null; global: null };
    expect(dados.sessao?.usado).toBe(2);
    expect(dados.global).toBeNull();
  });

  it("retorna contadores nulos quando o Supabase está fora (sem quebrar)", async () => {
    const janela = janelaAtualUtc();
    const hoje = dataDeHojeUtc();
    contagens.set(`sessao:${ID_SESSAO}:${janela}`, null);
    contagens.set(`global:${hoje}`, null);

    const req = criarRequisicao({
      sessaoId: ID_SESSAO,
      headers: {},
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    expect(corpo.status).toBe(200);
    const dados = corpo.dados as { sessao: null; global: null; renovaEm: string };
    expect(dados.sessao).toBeNull();
    expect(dados.global).toBeNull();
    expect(typeof dados.renovaEm).toBe("string");
  });

  it("não exibe restante negativo quando o uso passa do limite", async () => {
    const janela = janelaAtualUtc();
    contagens.set(`sessao:${ID_SESSAO}:${janela}`, 7);

    const req = criarRequisicao({
      sessaoId: ID_SESSAO,
      headers: {},
    });
    const { res, corpo } = criarResposta();

    await handler(req, res);

    const dados = corpo.dados as { sessao: { restante: number } | null };
    expect(dados.sessao?.restante).toBe(0);
  });
});
