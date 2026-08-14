// @vitest-environment node
// Módulo com funções puras (datas, IP/hash) + criação do cliente admin —
// ambiente node evita o jsdom desnecessário.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VercelRequest } from "@vercel/node";
import {
  chavePorIp,
  criarClienteSupabaseAdmin,
  dataDeHojeUtc,
  obterIpDoCliente,
  proximaMeiaNoiteUtc,
} from "./limites.js";

function reqCom(
  headers: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): VercelRequest {
  return {
    headers,
    socket: { remoteAddress },
  } as unknown as VercelRequest;
}

// O .env.local do projeto define variáveis reais — guarda os valores originais
// para restaurar depois dos testes que as alteram (vi.stubEnv cuida das
// stubadas; a remoção manual de SUPABASE_URL precisa de restauração explícita).
const envOriginal = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RATE_LIMIT_IP_SECRET: process.env.RATE_LIMIT_IP_SECRET,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  for (const [chave, valor] of Object.entries(envOriginal)) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
});

describe("dataDeHojeUtc — dia do contador global", () => {
  it("retorna a data UTC no formato YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T23:59:59.999Z"));
    expect(dataDeHojeUtc()).toBe("2026-08-09");
  });

  it("vira o dia exatamente na meia-noite UTC", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T00:00:00.000Z"));
    expect(dataDeHojeUtc()).toBe("2026-08-10");
  });
});

describe("proximaMeiaNoiteUtc — quando o teto global renova", () => {
  it("retorna a meia-noite UTC seguinte ao momento atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T15:30:00.000Z"));
    expect(proximaMeiaNoiteUtc()).toBe("2026-08-10T00:00:00.000Z");
  });

  it("é sempre estritamente maior que o momento atual", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T23:59:59.999Z"));
    const proxima = new Date(proximaMeiaNoiteUtc());
    expect(proxima.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("obterIpDoCliente — extração do IP real", () => {
  it("usa o primeiro item do x-forwarded-for (string com lista)", () => {
    expect(
      obterIpDoCliente(reqCom({ "x-forwarded-for": "203.0.113.10, 10.0.0.1" })),
    ).toBe("203.0.113.10");
  });

  it("usa o primeiro item quando o header chega como array", () => {
    expect(
      obterIpDoCliente(
        reqCom({ "x-forwarded-for": ["203.0.113.10", "10.0.0.1"] }),
      ),
    ).toBe("203.0.113.10");
  });

  it("remove espaços ao redor do endereço", () => {
    expect(obterIpDoCliente(reqCom({ "x-forwarded-for": "  203.0.113.10  " }))).toBe(
      "203.0.113.10",
    );
  });

  it("cai no remoteAddress quando não há x-forwarded-for", () => {
    expect(obterIpDoCliente(reqCom({}, "203.0.113.20"))).toBe("203.0.113.20");
  });

  it("ignora endereços de loopback locais", () => {
    expect(obterIpDoCliente(reqCom({}, "::1"))).toBeNull();
    expect(obterIpDoCliente(reqCom({}, "127.0.0.1"))).toBeNull();
  });

  it("retorna null quando não há IP disponível", () => {
    expect(obterIpDoCliente(reqCom({}))).toBeNull();
  });

  it("retorna null quando o x-forwarded-for está vazio", () => {
    expect(obterIpDoCliente(reqCom({ "x-forwarded-for": "   " }))).toBeNull();
  });
});

describe("chavePorIp — hash anônimo por janela", () => {
  beforeEach(() => {
    vi.stubEnv("RATE_LIMIT_IP_SECRET", "segredo-de-teste");
  });

  it("gera chave com prefixo ip:, hash HMAC e a janela no fim", () => {
    const chave = chavePorIp(
      reqCom({ "x-forwarded-for": "203.0.113.10" }),
      "2026-08-09T15",
    );
    expect(chave).toMatch(/^ip:[0-9a-f]{64}:2026-08-09T15$/);
  });

  it("é determinístico para o mesmo IP e janela", () => {
    const req = reqCom({ "x-forwarded-for": "203.0.113.10" });
    expect(chavePorIp(req, "2026-08-09T15")).toBe(chavePorIp(req, "2026-08-09T15"));
  });

  it("muda quando a janela muda (renovação por janela)", () => {
    const req = reqCom({ "x-forwarded-for": "203.0.113.10" });
    expect(chavePorIp(req, "2026-08-09T15")).not.toBe(
      chavePorIp(req, "2026-08-09T18"),
    );
  });

  it("gera chaves diferentes para IPs diferentes na mesma janela", () => {
    expect(
      chavePorIp(reqCom({ "x-forwarded-for": "203.0.113.10" }), "2026-08-09T15"),
    ).not.toBe(chavePorIp(reqCom({ "x-forwarded-for": "198.51.100.7" }), "2026-08-09T15"));
  });

  it("retorna null quando não há IP para hashear", () => {
    expect(chavePorIp(reqCom({}), "2026-08-09T15")).toBeNull();
  });
});

describe("criarClienteSupabaseAdmin — chave de serviço só no back-end", () => {
  it("retorna null sem a chave de serviço (fail-open)", () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(criarClienteSupabaseAdmin()).toBeNull();
  });

  it("retorna null sem URL configurada", () => {
    // O .env.local do projeto define VITE_SUPABASE_URL — zera para simular
    // ambiente sem URL.
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_teste");
    expect(criarClienteSupabaseAdmin()).toBeNull();
  });

  it("cria o cliente com SUPABASE_URL e a chave de serviço", () => {
    vi.stubEnv("SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_teste");
    expect(criarClienteSupabaseAdmin()).not.toBeNull();
  });

  it("reusa VITE_SUPABASE_URL quando SUPABASE_URL não existe", () => {
    // `criarClienteSupabaseAdmin` usa `??`, então só cai no fallback quando
    // SUPABASE_URL está ausente (undefined), não quando é string vazia.
    delete process.env.SUPABASE_URL;
    vi.stubEnv("VITE_SUPABASE_URL", "https://y.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_teste");
    expect(criarClienteSupabaseAdmin()).not.toBeNull();
  });
});
