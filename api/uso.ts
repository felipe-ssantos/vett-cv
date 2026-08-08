import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  LIMITE_ANALISES_GLOBAIS_DIA,
  LIMITE_ANALISES_POR_SESSAO_DIA,
  REGEX_UUID_SESSAO,
  criarClienteSupabaseAdmin,
  dataDeHojeUtc,
  proximaMeiaNoiteUtc,
} from "./limites.js";

// Cliente do Supabase usado apenas no back-end (chave de serviço, nunca
// exposta ao cliente).
const supabaseAdmin = criarClienteSupabaseAdmin();

// Lê o contador de uma chave (ex.: "sessao:<uuid>:2026-08-07"). Retorna 0
// quando a chave ainda não existe e null quando o serviço está indisponível.
async function obterContagem(chave: string): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("uso_analises")
    .select("contagem")
    .eq("chave", chave)
    .maybeSingle();
  if (error) {
    console.error("[rate-limit] falha ao consultar uso:", error.message);
    return null;
  }
  return typeof data?.contagem === "number" ? data.contagem : 0;
}

interface ContadorDeUso {
  usado: number;
  limite: number;
  restante: number;
}

function montarContador(
  usado: number | null,
  limite: number,
): ContadorDeUso | null {
  if (usado === null) return null;
  return { usado, limite, restante: Math.max(0, limite - usado) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  const sessaoIdRaw = Array.isArray(req.query.sessaoId)
    ? req.query.sessaoId[0]
    : req.query.sessaoId;
  const sessaoId =
    typeof sessaoIdRaw === "string" && REGEX_UUID_SESSAO.test(sessaoIdRaw)
      ? sessaoIdRaw
      : null;

  const hoje = dataDeHojeUtc();

  const [usadoSessao, usadoGlobal] = await Promise.all([
    sessaoId ? obterContagem(`sessao:${sessaoId}:${hoje}`) : Promise.resolve(null),
    obterContagem(`global:${hoje}`),
  ]);

  return res.status(200).json({
    sessao: montarContador(usadoSessao, LIMITE_ANALISES_POR_SESSAO_DIA),
    global: montarContador(usadoGlobal, LIMITE_ANALISES_GLOBAIS_DIA),
    renovaEm: proximaMeiaNoiteUtc(),
  });
}
