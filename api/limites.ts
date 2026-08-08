import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

// Limites de uso para proteger a cota gratuita do Gemini e do Supabase.
// Compartilhados entre o handler de análise (que incrementa) e o endpoint de
// consulta de cota (que apenas lê).
export const LIMITE_ANALISES_POR_SESSAO_DIA = 5;
export const LIMITE_ANALISES_GLOBAIS_DIA = 100;

// IDs de sessão vêm do cliente e são validados antes de virarem chave.
export const REGEX_UUID_SESSAO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// O dia do contador é a data UTC (YYYY-MM-DD) — a renovação acontece à
// meia-noite UTC.
export function dataDeHojeUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function proximaMeiaNoiteUtc(): string {
  const agora = new Date();
  const proxima = new Date(
    Date.UTC(
      agora.getUTCFullYear(),
      agora.getUTCMonth(),
      agora.getUTCDate() + 1,
    ),
  );
  return proxima.toISOString();
}

// Segredo usado no HMAC do IP. O IP bruto nunca é persistido — apenas um hash
// irreversível dele (proteção adicional contra ataques de dicionário).
// Quando nem RATE_LIMIT_IP_SECRET nem SUPABASE_SERVICE_ROLE_KEY existem, o
// fallback é uma constante pública: funcional, porém sem força criptográfica
// (a cota global fail-closed ainda protege o serviço nesse cenário).
function segredoHashIp(): string {
  const segredo =
    process.env.RATE_LIMIT_IP_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!segredo) {
    console.warn(
      "[rate-limit] RATE_LIMIT_IP_SECRET ausente — usando fallback público para o hash de IP. Configure a variável em produção.",
    );
    return "vett-hash-ip";
  }
  return segredo;
}

// Extrai o IP real do cliente. Na Vercel, o endereço original chega no header
// `x-forwarded-for` (o primeiro item da lista). Em dev local (vercel dev),
// cai no `req.socket.remoteAddress`.
export function obterIpDoCliente(req: VercelRequest): string | null {
  // O header pode chegar como string ou array; o primeiro item da lista é o
  // endereço original do cliente (na Vercel, os proxies anexam depois).
  const xForwardedFor = req.headers["x-forwarded-for"];
  const primeiroXff = Array.isArray(xForwardedFor)
    ? xForwardedFor[0]
    : xForwardedFor;
  if (typeof primeiroXff === "string" && primeiroXff.trim()) {
    return primeiroXff.split(",")[0]!.trim();
  }
  const remote = req.socket.remoteAddress;
  return remote && remote !== "::1" && remote !== "127.0.0.1" ? remote : null;
}

// Chave de contagem anônima por IP (ex.: "ip:<hash>:2026-08-07"). O IP em si
// não é armazenado — apenas um HMAC-SHA256 com segredo do servidor, que não
// pode ser revertido para o endereço original.
export function chavePorIp(req: VercelRequest, hoje: string): string | null {
  const ip = obterIpDoCliente(req);
  if (!ip) return null;
  const hash = createHmac("sha256", segredoHashIp())
    .update(ip)
    .digest("hex");
  return `ip:${hash}:${hoje}`;
}

// Cliente do Supabase usado apenas no back-end (chave de serviço, nunca
// exposta ao cliente). Sem a chave configurada, os limites são ignorados
// (fail-open) para não derrubar a aplicação.
export function criarClienteSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chaveServico) {
    console.warn(
      "[rate-limit] SUPABASE_SERVICE_ROLE_KEY ausente — limites de análise desativados.",
    );
    return null;
  }
  return createClient(url, chaveServico);
}
