import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs/promises";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import {
  LIMITE_ANALISES_GLOBAIS_DIA,
  LIMITE_ANALISES_POR_SESSAO_DIA,
  REGEX_UUID_SESSAO,
  chavePorIp,
  criarClienteSupabaseAdmin,
  dataDeHojeUtc,
} from "./limites.js";

export const config = {
  maxDuration: 60,
  api: { bodyParser: false },
};

const LIMITE_TAMANHO_ARQUIVO_BYTES = 4 * 1024 * 1024; // 4 MB

// Cliente do Supabase usado apenas no back-end (chave de serviço, nunca
// exposta ao cliente). Sem a chave configurada, o limite é ignorado
// (fail-open) para não derrubar a aplicação.
const supabaseAdmin = criarClienteSupabaseAdmin();

// Incremento atômico no PostgreSQL (INSERT ... ON CONFLICT DO UPDATE) via
// função incrementar_uso. Retorna null se o contador não estiver disponível.
async function incrementarUso(chave: string): Promise<number | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.rpc("incrementar_uso", {
    p_chave: chave,
  });
  if (error) {
    console.error("[rate-limit] falha ao incrementar uso:", error.message);
    return null;
  }
  return typeof data === "number" ? data : null;
}

interface ResultadoDeBloqueio {
  status: number;
  mensagem: string;
}

// Verifica (e incrementa) os contadores de uso. O navegador é identificado
// pela sessão anônima E pelo hash do IP — se qualquer um dos dois estourar o
// limite diário, a análise é bloqueada (429).
//
// Comportamento em falha:
// - Contadores por navegador (sessão/IP): fail-open — se o Supabase estiver
//   fora, o limite é ignorado para não derrubar a aplicação.
// - Teto global: fail-closed — se o contador global não puder ser lido, a
//   análise é bloqueada (503), pois o objetivo é proteger a cota da IA.
async function verificarLimites(
  req: VercelRequest,
  sessaoId: string | null,
): Promise<ResultadoDeBloqueio | null> {
  const hoje = dataDeHojeUtc();
  const chaveIp = chavePorIp(req, hoje);

  // Limite por sessão anônima (quando o cliente enviou um sessaoId válido).
  if (sessaoId) {
    const totalSessao = await incrementarUso(`sessao:${sessaoId}:${hoje}`);
    if (
      totalSessao !== null &&
      totalSessao > LIMITE_ANALISES_POR_SESSAO_DIA
    ) {
      return {
        status: 429,
        mensagem: `Você atingiu o limite de ${LIMITE_ANALISES_POR_SESSAO_DIA} análises por dia neste navegador. Volte amanhã!`,
      };
    }
  }

  // Limite por IP (hash anônimo) — cobre navegadores sem sessão e impede
  // burlar o limite simplesmente limpando o armazenamento local.
  if (chaveIp) {
    const totalIp = await incrementarUso(chaveIp);
    if (totalIp !== null && totalIp > LIMITE_ANALISES_POR_SESSAO_DIA) {
      return {
        status: 429,
        mensagem: `Você atingiu o limite de ${LIMITE_ANALISES_POR_SESSAO_DIA} análises por dia neste navegador. Volte amanhã!`,
      };
    }
  }

  // Teto global — fail-closed: contador indisponível bloqueia (503).
  // Obs.: quando chegamos aqui, os contadores por navegador (sessão/IP) já
  // foram incrementados. Se o Supabase estiver totalmente fora, essas chamadas
  // também falham (fail-open) e nada é contado; um 503 aqui consome cota local
  // mesmo sem registrar no global — aceitável pela prioridade de proteger a IA.
  const totalGlobal = await incrementarUso(`global:${hoje}`);
  if (totalGlobal === null) {
    console.error(
      "[rate-limit] contador global indisponível — bloqueando análise (fail-closed).",
    );
    return {
      status: 503,
      mensagem:
        "O serviço de contagem de análises está temporariamente indisponível. Tente novamente em instantes.",
    };
  }
  if (totalGlobal > LIMITE_ANALISES_GLOBAIS_DIA) {
    return {
      status: 429,
      mensagem: "O limite diário de análises do Vett foi atingido. Volte amanhã!",
    };
  }

  return null;
}

const EXTENSOES_POR_MIMETYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

class ErroDeArquivo extends Error {}

function extrairExtensao(
  nomeArquivo: string | undefined,
  mimetype: string | undefined,
): string {
  const ext = nomeArquivo?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf" || ext === "doc" || ext === "docx") return ext;
  return EXTENSOES_POR_MIMETYPE[mimetype ?? ""] ?? "";
}

const CABECALHO_PDF = Buffer.from("%PDF-", "latin1");

async function detectarTipoPorConteudo(
  filepath: string,
): Promise<string | null> {
  const handle = await fs.open(filepath, "r");
  try {
    const cabecalho = Buffer.alloc(8);
    const { bytesRead } = await handle.read(cabecalho, 0, 8, 0);

    if (bytesRead >= 5 && cabecalho.subarray(0, 5).equals(CABECALHO_PDF)) {
      return "pdf";
    }
    // DOCX é um ZIP (assinatura "PK\x03\x04").
    if (
      bytesRead >= 4 &&
      cabecalho[0] === 0x50 &&
      cabecalho[1] === 0x4b &&
      cabecalho[2] === 0x03 &&
      cabecalho[3] === 0x04
    ) {
      return "docx";
    }
    // .doc legado é OLE2 (assinatura "D0 CF 11 E0").
    if (
      bytesRead >= 8 &&
      cabecalho[0] === 0xd0 &&
      cabecalho[1] === 0xcf &&
      cabecalho[2] === 0x11 &&
      cabecalho[3] === 0xe0
    ) {
      return "doc";
    }
  } finally {
    await handle.close();
  }
  return null;
}

interface MatchPorCategoria {
  skills_tecnicas: number;
  ferramentas: number;
  experiencia: number;
  soft_skills: number;
}

interface AnaliseMatchIA {
  scoreMatch: number;
  matchPorCategoria: MatchPorCategoria;
  keywordsPresentes: string[];
  keywordsFaltando: string[];
  pontosFortes: string[];
  sugestoesAjuste: string[];
  resumoIA: string;
  dicaFinal: string;
}

interface VagaExtraidaIA {
  titulo: string;
  empresa: string | null;
  hardSkills: string[];
  softSkills: string[];
  senioridade: string | null;
}

async function extrairTextoDoArquivo(
  filepath: string,
  nomeArquivo: string | undefined,
  mimetype: string | undefined,
): Promise<string> {
  // O conteúdo tem prioridade: independe de como o navegador nomeou o arquivo.
  const tipo =
    (await detectarTipoPorConteudo(filepath)) ??
    extrairExtensao(nomeArquivo, mimetype);

  if (tipo === "pdf") {
    const buffer = await fs.readFile(filepath);
    try {
      const resultado = await pdfParse(buffer);
      return resultado.text;
    } catch {
      throw new ErroDeArquivo(
        "Não foi possível ler o PDF. Ele pode estar corrompido ou ser uma imagem sem texto extraível.",
      );
    }
  }

  if (tipo === "docx") {
    const buffer = await fs.readFile(filepath);
    try {
      const resultado = await mammoth.extractRawText({ buffer });
      return resultado.value;
    } catch {
      throw new ErroDeArquivo(
        "Não foi possível ler o DOCX. Ele pode estar corrompido ou não ser um documento Word válido.",
      );
    }
  }

  if (tipo === "doc") {
    // O mammoth só extrai texto de DOCX; .doc legado (binário) falharia com
    // erro genérico 500. Preferi uma mensagem clara para o usuário.
    throw new ErroDeArquivo(
      "Arquivos .doc antigos não são suportados. Envie o currículo em PDF ou DOCX.",
    );
  }

  throw new ErroDeArquivo(
    "Formato de arquivo não suportado. Envie PDF ou DOCX.",
  );
}

const FORMATO_ANALISE = `{
  "scoreMatch": number (0-100),
  "matchPorCategoria": {
    "skills_tecnicas": number (0-100),
    "ferramentas": number (0-100),
    "experiencia": number (0-100),
    "soft_skills": number (0-100)
  },
  "keywordsPresentes": string[],
  "keywordsFaltando": string[],
  "pontosFortes": string[],
  "sugestoesAjuste": string[],
  "resumoIA": string (2-3 frases sobre o alinhamento geral do perfil),
  "dicaFinal": string (1 frase objetiva com a ação mais impactante para subir a %)
}`;

function montarPromptComExtracao(
  curriculoTexto: string,
  descricaoVaga: string,
): string {
  return `Você é um especialista em recrutamento e ATS (Applicant Tracking System).
Primeiro, extraia os dados estruturados da vaga a partir do texto colado (que pode vir de qualquer site de emprego, com ruído/formatação misturada). Depois, compare o currículo com a vaga.

Retorne SOMENTE um JSON válido (sem markdown, sem \`\`\`), exatamente no formato abaixo, respeitando os nomes de propriedade exatamente como estão (note o underscore em "skills_tecnicas" e "soft_skills"):

{
  "vaga": {
    "titulo": string,
    "empresa": string | null,
    "hardSkills": string[] (tecnologias, ferramentas, certificações exigidas),
    "softSkills": string[],
    "senioridade": string | null (ex: "Júnior", "Pleno", "Sênior", ou null se não informado)
  },
  "analise": ${FORMATO_ANALISE}
}

DESCRIÇÃO DA VAGA (texto colado, pode ter ruído):
${descricaoVaga}

CURRÍCULO:
${curriculoTexto}`;
}

function montarPromptSoAnalise(
  curriculoTexto: string,
  vaga: {
    titulo: string;
    descricaoCompleta: string;
    hardSkills: string[];
    softSkills: string[];
    senioridade?: string | null;
  },
): string {
  return `Você é um especialista em recrutamento e ATS (Applicant Tracking System).
Compare o currículo abaixo com a vaga e retorne SOMENTE um JSON válido (sem markdown, sem \`\`\`), exatamente no formato abaixo, respeitando os nomes de propriedade exatamente como estão (note o underscore em "skills_tecnicas" e "soft_skills"):

${FORMATO_ANALISE}

VAGA:
Título: ${vaga.titulo}
Senioridade: ${vaga.senioridade ?? "não informado"}
Hard skills exigidas: ${vaga.hardSkills.join(", ")}
Soft skills exigidas: ${vaga.softSkills.join(", ")}
Descrição completa: ${vaga.descricaoCompleta}

CURRÍCULO:
${curriculoTexto}`;
}

interface RespostaGeminiAPI {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

async function chamarIA(prompt: string): Promise<string> {
  const response = await fetch(
    // A chave viaja no header x-goog-api-key (não na query string), para não
    // vazar em logs de proxy/servidor.
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Erro na chamada da IA: ${response.status}`);
  }

  const data = (await response.json()) as RespostaGeminiAPI;
  return data.candidates[0].content.parts[0].text;
}

class RespostaIAInvalidaError extends Error {}

function validarNumeroPercentual(valor: unknown, campo: string): number {
  if (typeof valor !== "number" || Number.isNaN(valor)) {
    throw new RespostaIAInvalidaError(
      `Campo "${campo}" ausente ou não é um número.`,
    );
  }
  if (valor < 0 || valor > 100) {
    throw new RespostaIAInvalidaError(
      `Campo "${campo}" fora do intervalo 0-100 (recebido: ${valor}).`,
    );
  }
  return valor;
}

function validarArrayDeStrings(valor: unknown, campo: string): string[] {
  if (!Array.isArray(valor) || valor.some((item) => typeof item !== "string")) {
    throw new RespostaIAInvalidaError(
      `Campo "${campo}" ausente ou não é uma lista de strings.`,
    );
  }
  return valor;
}

function validarString(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new RespostaIAInvalidaError(`Campo "${campo}" ausente ou vazio.`);
  }
  return valor;
}

function validarAnaliseIA(json: unknown): AnaliseMatchIA {
  if (typeof json !== "object" || json === null) {
    throw new RespostaIAInvalidaError(
      "Resposta da IA não é um objeto JSON válido.",
    );
  }
  const obj = json as Record<string, unknown>;

  const categoriaRaw = obj.matchPorCategoria;
  if (typeof categoriaRaw !== "object" || categoriaRaw === null) {
    throw new RespostaIAInvalidaError(
      'Campo "matchPorCategoria" ausente ou inválido.',
    );
  }
  const categoria = categoriaRaw as Record<string, unknown>;

  return {
    scoreMatch: validarNumeroPercentual(obj.scoreMatch, "scoreMatch"),
    matchPorCategoria: {
      skills_tecnicas: validarNumeroPercentual(
        categoria.skills_tecnicas,
        "matchPorCategoria.skills_tecnicas",
      ),
      ferramentas: validarNumeroPercentual(
        categoria.ferramentas,
        "matchPorCategoria.ferramentas",
      ),
      experiencia: validarNumeroPercentual(
        categoria.experiencia,
        "matchPorCategoria.experiencia",
      ),
      soft_skills: validarNumeroPercentual(
        categoria.soft_skills,
        "matchPorCategoria.soft_skills",
      ),
    },
    keywordsPresentes: validarArrayDeStrings(
      obj.keywordsPresentes,
      "keywordsPresentes",
    ),
    keywordsFaltando: validarArrayDeStrings(
      obj.keywordsFaltando,
      "keywordsFaltando",
    ),
    pontosFortes: validarArrayDeStrings(obj.pontosFortes, "pontosFortes"),
    sugestoesAjuste: validarArrayDeStrings(
      obj.sugestoesAjuste,
      "sugestoesAjuste",
    ),
    resumoIA: validarString(obj.resumoIA, "resumoIA"),
    dicaFinal: validarString(obj.dicaFinal, "dicaFinal"),
  };
}

function validarVagaExtraidaIA(json: unknown): VagaExtraidaIA {
  if (typeof json !== "object" || json === null) {
    throw new RespostaIAInvalidaError(
      "Dados da vaga extraídos pela IA não são um objeto JSON válido.",
    );
  }
  const obj = json as Record<string, unknown>;

  return {
    titulo: validarString(obj.titulo, "vaga.titulo"),
    empresa: typeof obj.empresa === "string" ? obj.empresa : null,
    hardSkills: validarArrayDeStrings(obj.hardSkills, "vaga.hardSkills"),
    softSkills: validarArrayDeStrings(obj.softSkills, "vaga.softSkills"),
    senioridade: typeof obj.senioridade === "string" ? obj.senioridade : null,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const descricaoVaga = fields.descricaoVaga?.[0];
    const vagaExistenteJson = fields.vagaExistente?.[0];
    const curriculoTextoColado = fields.curriculoTexto?.[0];
    const arquivo = files.arquivo?.[0];

    if (arquivo && arquivo.size === 0) {
      return res.status(400).json({ erro: "O arquivo enviado está vazio." });
    }

    if (arquivo && arquivo.size > LIMITE_TAMANHO_ARQUIVO_BYTES) {
      return res.status(400).json({
        erro: "O arquivo excede o limite de 4 MB. Envie um arquivo menor.",
      });
    }

    // Limite de uso (por sessão e global) — responde 429 antes de extrair o
    // arquivo e de consumir a cota do Gemini.
    const sessaoIdRaw = fields.sessaoId?.[0];
    const sessaoId =
      sessaoIdRaw && REGEX_UUID_SESSAO.test(sessaoIdRaw) ? sessaoIdRaw : null;

    const bloqueio = await verificarLimites(req, sessaoId);
    if (bloqueio) {
      return res.status(bloqueio.status).json({ erro: bloqueio.mensagem });
    }

    let curriculoTexto = curriculoTextoColado ?? "";
    if (arquivo) {
      curriculoTexto = await extrairTextoDoArquivo(
        arquivo.filepath,
        arquivo.originalFilename ?? undefined,
        arquivo.mimetype ?? undefined,
      );
    }

    if (!curriculoTexto.trim()) {
      return res.status(400).json({
        erro: "Nenhum texto de currículo foi encontrado (cole o texto ou envie um PDF/DOCX).",
      });
    }

    if (vagaExistenteJson) {
      const vagaExistente = JSON.parse(vagaExistenteJson);
      const prompt = montarPromptSoAnalise(curriculoTexto, vagaExistente);
      const respostaIA = await chamarIA(prompt);

      let respostaJson: unknown;
      try {
        respostaJson = JSON.parse(respostaIA);
      } catch {
        throw new RespostaIAInvalidaError("A IA não retornou um JSON válido.");
      }

      const analise = validarAnaliseIA(respostaJson);
      return res.status(200).json({ analise });
    }

    if (!descricaoVaga?.trim()) {
      return res.status(400).json({ erro: "Cole a descrição da vaga." });
    }

    const prompt = montarPromptComExtracao(curriculoTexto, descricaoVaga);
    const respostaIA = await chamarIA(prompt);

    let respostaJson: unknown;
    try {
      respostaJson = JSON.parse(respostaIA);
    } catch {
      throw new RespostaIAInvalidaError("A IA não retornou um JSON válido.");
    }

    const respostaObj = respostaJson as Record<string, unknown>;
    const vaga = validarVagaExtraidaIA(respostaObj.vaga);
    const analise = validarAnaliseIA(respostaObj.analise);

    return res
      .status(200)
      .json({ vaga, analise });
  } catch (erro) {
    console.error(erro);
    if (erro instanceof ErroDeArquivo) {
      return res.status(400).json({ erro: erro.message });
    }
    if (erro instanceof RespostaIAInvalidaError) {
      return res.status(502).json({
        erro: `A IA retornou uma resposta inválida: ${erro.message}`,
      });
    }
    return res.status(500).json({ erro: "Falha ao processar a análise." });
  }
}
