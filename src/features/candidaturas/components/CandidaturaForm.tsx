import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { normalizarMatchPorCategoria } from "../../../lib/normalizarAnalise";
import { supabase } from "../../../lib/supabaseClient";
import type { AnaliseMatchIA, Vaga } from "../../../types";

export function CandidaturaForm() {
  const { id: vagaId } = useParams();
  const navigate = useNavigate();

  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarVaga() {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .eq("id", vagaId)
        .single();
      if (error || !data) {
        setErro("Não foi possível carregar a vaga.");
      } else {
        setVaga(data);
      }
    }
    if (vagaId) carregarVaga();
  }, [vagaId]);

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!curriculoTexto.trim() && !arquivo) {
      setErro("Cole o texto do currículo ou envie um arquivo PDF/DOCX.");
      return;
    }
    if (!vaga) return;

    setAnalisando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append(
        "vagaExistente",
        JSON.stringify({
          titulo: vaga.titulo,
          descricaoCompleta: vaga.descricao_completa,
          hardSkills: vaga.hard_skills,
          softSkills: vaga.soft_skills,
          senioridade: vaga.senioridade ?? null,
        }),
      );
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
        analise,
      }: { curriculoTexto: string; analise: AnaliseMatchIA } =
        await resposta.json();

      // 1. Salva a candidatura contra a vaga já existente
      const { data: candidatura, error: erroCandidatura } = await supabase
        .from("candidaturas")
        .insert({
          vaga_id: vagaId,
          curriculo_texto: textoExtraido,
          status: "analisada",
        })
        .select()
        .single();

      if (erroCandidatura || !candidatura)
        throw new Error("Não foi possível salvar a candidatura.");

      // 2. Salva a análise
      const { error: erroAnalise } = await supabase.from("analises").insert({
        candidatura_id: candidatura.id,
        vaga_id: vagaId,
        score_match: analise.scoreMatch,
        match_por_categoria: normalizarMatchPorCategoria(
          analise.matchPorCategoria,
        ),
        keywords_presentes: analise.keywordsPresentes,
        keywords_faltando: analise.keywordsFaltando,
        pontos_fortes: analise.pontosFortes,
        sugestoes_ajuste: analise.sugestoesAjuste,
        resumo_ia: analise.resumoIA,
        dica_final: analise.dicaFinal,
      });

      if (erroAnalise) throw new Error("Não foi possível salvar a análise.");

      navigate(`/vagas/${vagaId}/candidatura/${candidatura.id}/resultado`);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado na análise.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Reanalisar currículo</h1>
      {vaga && (
        <p className="text-gray-500 mb-4">contra a vaga: {vaga.titulo}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Cole o texto do currículo
          </label>
          <textarea
            className="border rounded p-2 w-full"
            rows={8}
            placeholder="Cole aqui o texto do seu currículo (ex: já ajustado com base na dica anterior)..."
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
            Envie o arquivo (PDF ou DOCX)
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
          disabled={analisando || !vaga}
          className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50 w-full"
        >
          {analisando ? "Analisando..." : "Analisar"}
        </button>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
      </form>
    </div>
  );
}
