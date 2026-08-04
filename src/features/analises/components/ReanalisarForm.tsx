import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise, AnaliseMatchIA } from "../../../types";

export function ReanalisarForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analiseBase, setAnaliseBase] = useState<Analise | null>(null);
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAnaliseBase() {
      const { data, error } = await supabase
        .from("analises")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        setErro("Não foi possível carregar a análise original.");
      } else {
        setAnaliseBase(data);
      }
    }
    if (id) carregarAnaliseBase();
  }, [id]);

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
    if (!analiseBase) return;

    setAnalisando(true);
    setErro(null);

    try {
      const formData = new FormData();
      formData.append(
        "vagaExistente",
        JSON.stringify({
          titulo: analiseBase.titulo_vaga,
          descricaoCompleta: analiseBase.descricao_vaga,
          hardSkills: analiseBase.hard_skills,
          softSkills: analiseBase.soft_skills,
          senioridade: analiseBase.senioridade ?? null,
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

      const { data: novaAnalise, error: erroAnalise } = await supabase
        .from("analises")
        .insert({
          titulo_vaga: analiseBase.titulo_vaga,
          empresa: analiseBase.empresa,
          descricao_vaga: analiseBase.descricao_vaga,
          hard_skills: analiseBase.hard_skills,
          soft_skills: analiseBase.soft_skills,
          senioridade: analiseBase.senioridade,
          curriculo_texto: textoExtraido,
          score_match: analise.scoreMatch,
          match_por_categoria: analise.matchPorCategoria,
          keywords_presentes: analise.keywordsPresentes,
          keywords_faltando: analise.keywordsFaltando,
          pontos_fortes: analise.pontosFortes,
          sugestoes_ajuste: analise.sugestoesAjuste,
          resumo_ia: analise.resumoIA,
          dica_final: analise.dicaFinal,
        })
        .select()
        .single();

      if (erroAnalise || !novaAnalise)
        throw new Error("Não foi possível salvar a nova análise.");

      navigate(`/analises/${novaAnalise.id}`);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado na análise.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <h1 className="mb-1">Reanalisar currículo</h1>
        {analiseBase && (
          <p className="text-secondary mb-4">
            contra a vaga: {analiseBase.titulo_vaga}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Cole o texto do currículo</label>
            <textarea
              className="form-control"
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

          <div className="text-center text-secondary small mb-3">ou</div>

          <div className="mb-3">
            <label className="form-label">Envie o arquivo (PDF ou DOCX)</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleArquivoChange}
              className="form-control"
            />
            {arquivo && (
              <div className="form-text">Selecionado: {arquivo.name}</div>
            )}
          </div>

          <button
            type="submit"
            disabled={analisando || !analiseBase}
            className="btn btn-primary w-100"
          >
            {analisando ? "Analisando..." : "Analisar oportunidade →"}
          </button>

          {erro && <div className="alert alert-danger mt-3">{erro}</div>}
        </form>
      </div>
    </div>
  );
}
