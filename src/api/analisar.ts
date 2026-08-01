import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import formidable from "formidable";
import fs from "fs/promises";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const config = {
  api: { bodyParser: false },
};

// Cliente Supabase server-side. A policy de `vagas` já libera select público,
// então a anon key é suficiente aqui (não precisa da service role key).
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
);

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

function montarPrompt(
  curriculoTexto: string,
  vaga: {
    titulo: string;
    descricao_completa: string;
    hard_skills: string[];
    soft_skills: string[];
    senioridade?: string;
  },
): string {
  return `Você é um especialista em recrutamento e ATS (Applicant Tracking System).
Compare o currículo abaixo com a vaga e retorne SOMENTE um JSON válido (sem markdown, sem \`\`\`), no formato:

{
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
}

VAGA:
Título: ${vaga.titulo}
Senioridade: ${vaga.senioridade ?? "não informado"}
Hard skills exigidas: ${vaga.hard_skills.join(", ")}
Soft skills exigidas: ${vaga.soft_skills.join(", ")}
Descrição completa: ${vaga.descricao_completa}

CURRÍCULO:
${curriculoTexto}`;
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

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const form = formidable({ multiples: false });
    const [fields, files] = await form.parse(req);

    const vagaId = fields.vagaId?.[0];
    const curriculoTextoColado = fields.curriculoTexto?.[0];
    const arquivo = files.arquivo?.[0];

    if (!vagaId) {
      return res.status(400).json({ erro: "vagaId é obrigatório" });
    }

    // Extrai o texto: prioriza arquivo enviado, senão usa o texto colado
    let curriculoTexto = curriculoTextoColado ?? "";
    if (arquivo) {
      curriculoTexto = await extrairTextoDoArquivo(
        arquivo.filepath,
        arquivo.originalFilename ?? "",
      );
    }

    if (!curriculoTexto.trim()) {
      return res
        .status(400)
        .json({
          erro: "Nenhum texto de currículo foi encontrado (cole o texto ou envie um PDF/DOCX).",
        });
    }

    // Busca os dados da vaga
    const { data: vaga, error: erroVaga } = await supabase
      .from("vagas")
      .select(
        "titulo, descricao_completa, hard_skills, soft_skills, senioridade",
      )
      .eq("id", vagaId)
      .single();

    if (erroVaga || !vaga) {
      return res.status(404).json({ erro: "Vaga não encontrada" });
    }

    const prompt = montarPrompt(curriculoTexto, vaga);
    const respostaIA = await chamarIA(prompt);
    const analise = JSON.parse(respostaIA);

    return res.status(200).json({ curriculoTexto, analise });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: "Falha ao processar a análise." });
  }
}
