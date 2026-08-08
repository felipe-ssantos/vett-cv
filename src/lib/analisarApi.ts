import type { AnaliseMatchIA, VagaExtraidaIA } from "../types";
import { supabase } from "./supabaseClient";

const TIMEOUT_ANALISE_MS = 90_000;

export interface RespostaAnalisar {
  vaga?: VagaExtraidaIA;
  analise: AnaliseMatchIA;
}

// Navegadores com proteção de privacidade (ex.: Brave) e o próprio servidor
// podem responder com HTML em vez de JSON (ex.: 413/502/504). Aqui extraío a melhor mensagem possível.
async function extrairMensagemDeErro(resposta: Response): Promise<string> {
  const contentType = resposta.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const corpo = await resposta.json().catch(() => null);
    if (corpo?.erro) return String(corpo.erro);
  }
  if (resposta.status === 413) {
    return "O arquivo é grande demais para o servidor. Envie um arquivo com menos de 4 MB.";
  }
  if (resposta.status === 502 || resposta.status === 504) {
    return "O servidor demorou demais para responder. Tente novamente em instantes.";
  }
  if (resposta.status === 503) {
    return "O serviço de contagem de análises está temporariamente indisponível. Tente novamente em instantes.";
  }
  if (resposta.status === 429) {
    return "Limite de análises diárias atingido. Tente novamente amanhã.";
  }
  return `Falha na análise (HTTP ${resposta.status}). Tente novamente.`;
}

// Identifica a sessão anônima do Supabase (usada no limite de análises por dia
// e na consulta de cota). Falhas aqui nunca devem impedir a análise.
export async function obterIdSessao(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

export async function enviarAnalise(
  formData: FormData,
): Promise<RespostaAnalisar> {
  const sessaoId = await obterIdSessao();
  if (sessaoId) formData.append("sessaoId", sessaoId);

  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_ANALISE_MS);

  try {
    const resposta = await fetch("/api/analisar", {
      method: "POST",
      body: formData,
      signal: controlador.signal,
    });

    if (!resposta.ok) {
      throw new Error(await extrairMensagemDeErro(resposta));
    }

    return (await resposta.json()) as RespostaAnalisar;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "A análise demorou mais que o esperado. Tente novamente em instantes.",
        { cause: err },
      );
    }
    if (err instanceof TypeError) {
      throw new Error(
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
        { cause: err },
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
