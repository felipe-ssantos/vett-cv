import type { AnaliseMatchIA, VagaExtraidaIA } from "../types";

const TIMEOUT_ANALISE_MS = 90_000;

export interface RespostaAnalisar {
  curriculoTexto: string;
  descricaoVaga?: string;
  vaga?: VagaExtraidaIA;
  analise: AnaliseMatchIA;
}

// Navegadores com proteção de privacidade (ex.: Brave) e o próprio servidor
// podem responder com HTML em vez de JSON (ex.: 413/502/504). Aqui extraímos a
// melhor mensagem possível em vez de cair no genérico "Falha na análise".
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
  return `Falha na análise (HTTP ${resposta.status}). Tente novamente.`;
}

export async function enviarAnalise(
  formData: FormData,
): Promise<RespostaAnalisar> {
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
