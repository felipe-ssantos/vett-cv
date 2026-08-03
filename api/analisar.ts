import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs/promises";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const config = {
  api: { bodyParser: false },
};

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
    "skillsTecnicas": number (0-100),
    "ferramentas": number (0-100),
    "experiencia": number (0-100),
    "softSkills": number (0-100)
  },
  "keywordsPresentes": string[],
  "keywordsFaltando": string[],
  "pontosFortes": string[],
  "sugestoesAjuste": string[],
  "resumoIA": string (2-3 frases sobre o alinhamento geral do perfil),
  "dicaFinal": string (1 frase objetiva com a ação mais impactante para subir a %)
}`;

// Vaga nova: a IA extrai os dados estruturados a partir do texto colado E analisa o match.
function montarPromptComExtracao(
  curriculoTexto: string,
  descricaoVaga: string,
): string {
  return `Você é um especialista em recrutamento e ATS (Applicant Tracking System).
Primeiro, extraia os dados estruturados da vaga a partir do texto colado (que pode vir de qualquer site de emprego, com ruído/formatação misturada). Depois, compare o currículo com a vaga.

Retorne SOMENTE um JSON válido (sem markdown, sem \`\`\`), no formato:

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

// Vaga já existente: os dados estruturados já são conhecidos, só analisa o match.
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
Compare o currículo abaixo com a vaga e retorne SOMENTE um JSON válido (sem markdown, sem \`\`\`), no formato:

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const descricaoVaga = fields.descricaoVaga?.[0];
    const vagaExistenteJson = fields.vagaExistente?.[0]; // presente quando reanalisando contra vaga já cadastrada
    const curriculoTextoColado = fields.curriculoTexto?.[0];
    const arquivo = files.arquivo?.[0];

    // Extrai o texto do currículo: prioriza arquivo enviado, senão usa o texto colado
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
      // Fluxo B: vaga já cadastrada, só analisa o match
      const vagaExistente = JSON.parse(vagaExistenteJson);
      const prompt = montarPromptSoAnalise(curriculoTexto, vagaExistente);
      const respostaIA = await chamarIA(prompt);
      const analise = JSON.parse(respostaIA);
      return res.status(200).json({ curriculoTexto, analise });
    }

    if (!descricaoVaga?.trim()) {
      return res.status(400).json({ erro: "Cole a descrição da vaga." });
    }

    // Fluxo A: vaga nova, extrai os dados e analisa
    const prompt = montarPromptComExtracao(curriculoTexto, descricaoVaga);
    const respostaIA = await chamarIA(prompt);
    const { vaga, analise } = JSON.parse(respostaIA);

    return res
      .status(200)
      .json({ curriculoTexto, descricaoVaga, vaga, analise });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Falha ao processar a análise." });
  }
}
