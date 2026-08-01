import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { AnaliseMatchIA } from "../../../types";

interface VagaExtraidaIA {
  titulo: string;
  empresa: string | null;
  hardSkills: string[];
  softSkills: string[];
  senioridade: string | null;
}

export function AnalisarForm() {
  const navigate = useNavigate();

  const [descricaoVaga, setDescricaoVaga] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!descricaoVaga.trim()) {
      setErro("Cole a descrição da vaga.");
      return;
    }
    if (!curriculoTexto.trim() && !arquivo) {
      setErro("Cole o texto do currículo ou envie um arquivo PDF/DOCX.");
      return;
    }

    setAnalisando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append("descricaoVaga", descricaoVaga);
      if (arquivo) {
        formData.append("arquivo", arquivo);
      } else {
        formData.append("curriculoTexto", curriculoTexto);
      }

      const resposta = await fetch("/api/analisar", {
        method: "POST",
        body: formData,
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? "Falha na análise");
      }

      const {
        curriculoTexto: textoExtraido,
        descricaoVaga: descricaoOriginal,
        vaga,
        analise,
      }: {
        curriculoTexto: string;
        descricaoVaga: string;
        vaga: VagaExtraidaIA;
        analise: AnaliseMatchIA;
      } = await resposta.json();

      // 1. Salva a vaga (dados extraídos pela IA a partir do texto colado)
      const { data: vagaSalva, error: erroVaga } = await supabase
        .from("vagas")
        .insert({
          titulo: vaga.titulo,
          empresa: vaga.empresa,
          descricao_completa: descricaoOriginal,
          hard_skills: vaga.hardSkills,
          soft_skills: vaga.softSkills,
          senioridade: vaga.senioridade,
        })
        .select()
        .single();

      if (erroVaga || !vagaSalva)
        throw new Error("Não foi possível salvar a vaga.");

      // 2. Salva a candidatura
      const { data: candidatura, error: erroCandidatura } = await supabase
        .from("candidaturas")
        .insert({
          vaga_id: vagaSalva.id,
          curriculo_texto: textoExtraido,
          status: "analisada",
        })
        .select()
        .single();

      if (erroCandidatura || !candidatura)
        throw new Error("Não foi possível salvar a candidatura.");

      // 3. Salva a análise
      const { error: erroAnalise } = await supabase.from("analises").insert({
        candidatura_id: candidatura.id,
        vaga_id: vagaSalva.id,
        score_match: analise.scoreMatch,
        match_por_categoria: analise.matchPorCategoria,
        keywords_presentes: analise.keywordsPresentes,
        keywords_faltando: analise.keywordsFaltando,
        pontos_fortes: analise.pontosFortes,
        sugestoes_ajuste: analise.sugestoesAjuste,
        resumo_ia: analise.resumoIA,
        dica_final: analise.dicaFinal,
      });

      if (erroAnalise) throw new Error("Não foi possível salvar a análise.");

      navigate(
        `/vagas/${vagaSalva.id}/candidatura/${candidatura.id}/resultado`,
      );
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado na análise.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Analisar currículo x vaga</h1>
      <p className="text-gray-500 mb-4">
        Cole a descrição da vaga (de qualquer site) e o seu currículo, depois
        clique em Analisar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Descrição da vaga
          </label>
          <textarea
            className="border rounded p-2 w-full"
            rows={8}
            placeholder="Cole aqui a descrição completa da vaga (Indeed, LinkedIn, etc.)..."
            value={descricaoVaga}
            onChange={(e) => setDescricaoVaga(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Cole o texto do currículo
          </label>
          <textarea
            className="border rounded p-2 w-full"
            rows={8}
            placeholder="Cole aqui o texto do seu currículo..."
            value={curriculoTexto}
            onChange={(e) => {
              setCurriculoTexto(e.target.value);
              if (e.target.value) setArquivo(null);
            }}
            disabled={!!arquivo}
          />
        </div>

        <div className="text-center text-gray-400 text-sm">ou</div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Envie o arquivo do currículo (PDF ou DOCX)
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleArquivoChange}
            className="block w-full text-sm"
          />
          {arquivo && (
            <p className="text-sm text-gray-600 mt-1">
              Selecionado: {arquivo.name}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={analisando}
          className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50 w-full"
        >
          {analisando ? "Analisando..." : "Analisar"}
        </button>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
      </form>
    </div>
  );
}
