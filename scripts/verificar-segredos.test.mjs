// @vitest-environment node
// Testes unitários do scanner de segredos (scripts/verificar-segredos.mjs).
// Testam a função pura `detectarSegredosEmTexto` — cada padrão de chave é
// detectado, e textos comuns/placeholders não geram falsos positivos.
//
// IMPORTANTE: os exemplos de chave abaixo são montados por CONCATENAÇÃO em
// runtime. O scanner varre o repositório INTEIRO (inclusive este arquivo de
// teste), então uma chave literal no texto-fonte dispararia o próprio scan.
// Juntar os pedaços só em runtime mantém os exemplos fora do texto detectável.
import { describe, expect, it } from "vitest";
import { detectarSegredosEmTexto, PADROES } from "./verificar-segredos.mjs";

const j = (partes) => partes.join("");

const JWT_EXEMPLO = j([
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  ".",
  "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
  ".",
  "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
]);

const SUPABASE_PUBLICAVEL = j(["sb_", "publishable_", "AbCdEfGhIjKlMnO_pQrStUvWxYz123"]);
const SUPABASE_SECRETA = j(["sb_", "secret_", "AbCdEfGhIjKlMnO_pQrStUvWxYz123"]);
const GOOGLE = j(["AIza", "SyDfGjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQr"]);
const OPENAI = j(["sk-", "proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890"]);
const GITHUB = j(["ghp_", "AbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEf"]);
const SLACK = j(["xoxb-", "123456789012-123456789012-AbCdEfGhIjKlMnOpQrStUv"]);
const AWS = j(["AKIA", "IOSFODNN7EXAMPLE12345678"]);
const PRIVADA = (rotulo) => j(["-----BEGIN ", rotulo, "PRIVATE KEY-----"]);

describe("detectarSegredosEmTexto — cada padrão de chave", () => {
  it("detecta JWT (eyJ...) com três segmentos", () => {
    const achados = detectarSegredosEmTexto(`token=${JWT_EXEMPLO}`);
    expect(achados.some((a) => a.nome.includes("JWT"))).toBe(true);
  });

  it("detecta chave publicável do Supabase (sb_publishable_)", () => {
    const achados = detectarSegredosEmTexto(SUPABASE_PUBLICAVEL);
    expect(achados.some((a) => a.nome.includes("publicável"))).toBe(true);
  });

  it("detecta chave secreta do Supabase (sb_secret_)", () => {
    const achados = detectarSegredosEmTexto(SUPABASE_SECRETA);
    expect(achados.some((a) => a.nome.includes("secreta"))).toBe(true);
  });

  it("detecta chave da Google (AIza...)", () => {
    const achados = detectarSegredosEmTexto(GOOGLE);
    expect(achados.some((a) => a.nome.includes("Google"))).toBe(true);
  });

  it("detecta token OpenAI (sk-)", () => {
    const achados = detectarSegredosEmTexto(OPENAI);
    expect(achados.some((a) => a.nome.includes("OpenAI"))).toBe(true);
  });

  it("detecta token GitHub (ghp_)", () => {
    const achados = detectarSegredosEmTexto(GITHUB);
    expect(achados.some((a) => a.nome.includes("GitHub"))).toBe(true);
  });

  it("detecta token Slack (xoxb-)", () => {
    const achados = detectarSegredosEmTexto(SLACK);
    expect(achados.some((a) => a.nome.includes("Slack"))).toBe(true);
  });

  it("detecta chave AWS (AKIA)", () => {
    const achados = detectarSegredosEmTexto(AWS);
    expect(achados.some((a) => a.nome.includes("AWS"))).toBe(true);
  });

  it("detecta chave privada (RSA/EC/OpenSSH/PGP/ENCRYPTED)", () => {
    const rotulos = ["", "RSA ", "EC ", "OPENSSH ", "ENCRYPTED "];
    for (const rotulo of rotulos) {
      const achados = detectarSegredosEmTexto(PRIVADA(rotulo));
      expect(
        achados.some((a) => a.nome.includes("Chave privada")),
        `deveria detectar: ${PRIVADA(rotulo)}`,
      ).toBe(true);
    }
  });
});

describe("detectarSegredosEmTexto — sem falsos positivos", () => {
  it("ignora texto comum de código", () => {
    const codigo = `
      const url = process.env.VITE_SUPABASE_URL ?? "https://projeto.supabase.co";
      const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
      // GEMINI_API_KEY é lida do servidor, nunca hardcoded.
    `;
    expect(detectarSegredosEmTexto(codigo)).toHaveLength(0);
  });

  it("ignora o template .env.local.example (valores vazios)", () => {
    const template = [
      "VITE_SUPABASE_URL=",
      "VITE_SUPABASE_ANON_KEY=",
      "GEMINI_API_KEY=",
      "SUPABASE_SERVICE_ROLE_KEY=",
      "RATE_LIMIT_IP_SECRET=",
    ].join("\n");
    expect(detectarSegredosEmTexto(template)).toHaveLength(0);
  });

  it("ignora menções a variáveis de ambiente em comentários", () => {
    const comentario =
      "Configure GEMINI_API_KEY e SUPABASE_SERVICE_ROLE_KEY no ambiente.";
    expect(detectarSegredosEmTexto(comentario)).toHaveLength(0);
  });

  it("ignora UUIDs e hashes sha512 (que não são chaves)", () => {
    const texto =
      "id=550e8400-e29b-41d4-a716-446655440000 hash=sha512-abc123def456";
    expect(detectarSegredosEmTexto(texto)).toHaveLength(0);
  });
});

describe("configuração do scanner", () => {
  it("exporta padrões nomeados (rastreabilidade das regras)", () => {
    expect(PADROES.length).toBeGreaterThanOrEqual(9);
    expect(PADROES.map((p) => p.nome)).toEqual(expect.arrayContaining([
      expect.stringContaining("JWT"),
      expect.stringContaining("Supabase"),
      expect.stringContaining("Google"),
      expect.stringContaining("Chave privada"),
    ]));
  });
});
