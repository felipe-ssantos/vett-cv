import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { AnaliseMatchIA, VagaExtraidaIA } from "../../../types";

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

      const { data: analiseSalva, error: erroAnalise } = await supabase
        .from("analises")
        .insert({
          titulo_vaga: vaga.titulo,
          empresa: vaga.empresa,
          descricao_vaga: descricaoOriginal,
          hard_skills: vaga.hardSkills,
          soft_skills: vaga.softSkills,
          senioridade: vaga.senioridade,
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

      if (erroAnalise || !analiseSalva)
        throw new Error("Não foi possível salvar a análise.");

      navigate(`/analises/${analiseSalva.id}`);
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
        <h1 className="mb-1">Analisar currículo x vaga</h1>
        <p className="text-secondary mb-4">
          Cole a descrição da vaga (de qualquer site) e o seu currículo, depois
          clique em Analisar.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2">
              <span className="numero-circulo">1</span>
              Descrição da vaga
            </label>
            <textarea
              className="form-control"
              rows={8}
              placeholder="Cole aqui a descrição completa da vaga (Indeed, LinkedIn, etc.)..."
              value={descricaoVaga}
              onChange={(e) => setDescricaoVaga(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label d-flex align-items-center gap-2">
              <span className="numero-circulo">2</span>
              Cole o texto do currículo
            </label>
            <textarea
              className="form-control"
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

          <div className="text-center text-secondary small mb-3">ou</div>

          <div className="mb-3">
            <label className="form-label">
              Envie o arquivo do currículo (PDF ou DOCX)
            </label>
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
            disabled={analisando}
            className="btn btn-primary w-100"
          >
            {analisando ? "Analisando..." : "Analisar Job Fit"}
          </button>

          <p className="text-center text-secondary small mt-2 mb-0">
            Análise feita com IA - seus dados não são armazenados
          </p>

          {erro && <div className="alert alert-danger mt-3">{erro}</div>}
        </form>
      </div>
    </div>
  );
}
