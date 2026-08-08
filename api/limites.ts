import { createClient } from "@supabase/supabase-js";

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
