import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  LIMITE_ANALISES_GLOBAIS_DIA,
  LIMITE_ANALISES_POR_SESSAO,
  REGEX_UUID_SESSAO,
  chavePorIp,
  criarClienteSupabaseAdmin,
  dataDeHojeUtc,
  janelaAtualUtc,
  proximaLimiteJanelaUtc,
} from "./limites.js";

// Cliente do Supabase usado apenas no back-end (chave de serviço, nunca
// exposta ao cliente).
const supabaseAdmin = criarClienteSupabaseAdmin();

// Lê o contador de uma chave (ex.: "sessao:<uuid>:2026-08-09T15" — janela de
// 3h). Retorna 0 quando a chave ainda não existe e null quando o serviço está
// indisponível.
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

  // A cota por navegador (sessão/IP) usa janelas de 3 horas; o teto global
  // continua diário (data UTC).
  const janela = janelaAtualUtc();
  const hoje = dataDeHojeUtc();
  const chaveIp = chavePorIp(req, janela);

  const [usadoSessao, usadoIp, usadoGlobal] = await Promise.all([
    sessaoId
      ? obterContagem(`sessao:${sessaoId}:${janela}`)
      : Promise.resolve(null),
    chaveIp ? obterContagem(chaveIp) : Promise.resolve(null),
    obterContagem(`global:${hoje}`),
  ]);

  // O bloqueio por navegador acontece quando a sessão OU o IP estoura. Para
  // exibir o contador correto, usamos o maior uso entre os dois (ou null se
  // nenhum estiver disponível).
  const usadoNavegador =
    usadoSessao === null && usadoIp === null
      ? null
      : Math.max(usadoSessao ?? 0, usadoIp ?? 0);

  return res.status(200).json({
    sessao: montarContador(usadoNavegador, LIMITE_ANALISES_POR_SESSAO),
    global: montarContador(usadoGlobal, LIMITE_ANALISES_GLOBAIS_DIA),
    // A renovação exibida é a da cota por navegador (janela de 3 horas).
    renovaEm: proximaLimiteJanelaUtc(),
  });
}
