import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs/promises";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const config = {
  api: { bodyParser: false },
};

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
  filename: string,
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const buffer = await fs.readFile(filepath);
    const parser = new PDFParse({ data: buffer });
    const resultado = await parser.getText();
    return resultado.text;
  }

  if (ext === "docx" || ext === "doc") {
    const buffer = await fs.readFile(filepath);
    const resultado = await mammoth.extractRawText({ buffer });
    return resultado.value;
  }

  throw new Error("Formato de arquivo não suportado. Envie PDF ou DOCX.");
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    let curriculoTexto = curriculoTextoColado ?? "";
    if (arquivo) {
      curriculoTexto = await extrairTextoDoArquivo(
        arquivo.filepath,
        arquivo.originalFilename ?? "",
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
      return res.status(200).json({ curriculoTexto, analise });
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
      .json({ curriculoTexto, descricaoVaga, vaga, analise });
  } catch (erro) {
    console.error(erro);
    if (erro instanceof RespostaIAInvalidaError) {
      return res.status(502).json({
        erro: `A IA retornou uma resposta inválida: ${erro.message}`,
      });
    }
    return res.status(500).json({ erro: "Falha ao processar a análise." });
  }
}
