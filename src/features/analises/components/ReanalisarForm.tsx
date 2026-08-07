import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  LuArrowLeft,
  LuArrowRight,
  LuUser,
  LuCheck,
  LuFileText,
  LuX,
} from "react-icons/lu";
import { supabase } from "../../../lib/supabaseClient";
import { formatarTamanhoArquivo } from "../../../lib/formatarArquivo";
import type { Analise, AnaliseMatchIA } from "../../../types";

const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024; // 5 MB
const ROTULO_TAMANHO_MAXIMO = "5 MB";

export function ReanalisarForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analiseBase, setAnaliseBase] = useState<Analise | null>(null);
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

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
    if (file && file.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErroArquivo(
        `O arquivo excede o limite de ${ROTULO_TAMANHO_MAXIMO}. Envie um arquivo menor.`,
      );
      setArquivo(null);
      e.target.value = "";
      return;
    }
    setErroArquivo(null);
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  function handleRemoverArquivo() {
    setArquivo(null);
    setErroArquivo(null);
    if (arquivoInputRef.current) {
      arquivoInputRef.current.value = "";
      arquivoInputRef.current.focus();
    }
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
    <div className="fade-in-up" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="mb-4">
        <Link
          to={analiseBase ? `/analises/${analiseBase.id}` : "/historico"}
          className="text-decoration-none d-inline-flex align-items-center gap-1 text-secondary"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          <LuArrowLeft size={16} /> Voltar à análise
        </Link>
      </div>

      <div className="vett-card p-4">
        <div className="vett-card-header">
          <div className="vett-icon-circle">
            <LuUser />
          </div>
          <div>
            <h1 className="h5 fw-bold mb-1">Reanalisar currículo</h1>
            {analiseBase && (
              <p className="mb-0 text-secondary" style={{ fontSize: 14 }}>
                Comparando novo currículo para: <strong>{analiseBase.titulo_vaga}</strong>
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label
              className="vett-field-label mb-2"
              htmlFor="reanalisar-curriculo"
            >
              Cole o novo texto do currículo
            </label>
            <div className="vett-input-wrapper">
              <textarea
                id="reanalisar-curriculo"
                className="form-control vett-textarea w-100"
                style={{ height: 220 }}
                placeholder="Cole aqui o texto do seu currículo atualizado..."
                value={curriculoTexto}
                onChange={(e) => {
                  setCurriculoTexto(e.target.value);
                  if (e.target.value) setArquivo(null);
                }}
                disabled={!!arquivo}
              />
              {curriculoTexto.trim().length > 0 && (
                <div className="vett-check-badge" aria-hidden="true">
                  <LuCheck />
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-secondary small my-3">ou</div>

          <div className="mb-4">
            <label
              className="vett-field-label mb-2"
              htmlFor="reanalisar-arquivo"
            >
              Envie o arquivo do currículo
            </label>
            <input
              id="reanalisar-arquivo"
              ref={arquivoInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleArquivoChange}
              onKeyDown={(e) => {
                if (e.key === "Escape" && arquivo) {
                  e.preventDefault();
                  handleRemoverArquivo();
                }
              }}
              className="form-control"
              aria-describedby="reanalisar-arquivo-desc"
            />
            <div
              id="reanalisar-arquivo-desc"
              className="form-text"
              style={{ fontSize: 11.5 }}
            >
              Formatos aceitos: <strong>PDF, DOC ou DOCX</strong> (máx.{" "}
              {ROTULO_TAMANHO_MAXIMO}) — o texto do currículo será extraído
              automaticamente.
            </div>
            {erroArquivo && (
              <div
                className="form-text text-danger"
                style={{ fontSize: 11.5 }}
                role="alert"
              >
                {erroArquivo}
              </div>
            )}
            {arquivo && (
              <div
                className="d-flex align-items-center justify-content-between gap-2 mt-1"
                role="status"
              >
                <div
                  className="form-text mb-0 text-truncate"
                  style={{ fontSize: 11.5, minWidth: 0 }}
                >
                  <LuFileText
                    size={12}
                    className="me-1"
                    aria-hidden="true"
                  />
                  Selecionado: {arquivo.name} (
                  {formatarTamanhoArquivo(arquivo.size)})
                </div>
                <button
                  type="button"
                  onClick={handleRemoverArquivo}
                  className="btn btn-sm btn-outline-secondary border-0 p-0 text-danger d-inline-flex align-items-center gap-1"
                  style={{ fontSize: 11, flexShrink: 0 }}
                  title="Remover arquivo selecionado"
                  aria-label="Remover arquivo selecionado"
                >
                  <LuX size={13} aria-hidden="true" /> Remover
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={analisando || !analiseBase}
            className="btn-vett-primary"
          >
            {analisando ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
                Analisando...
              </>
            ) : (
              <>
                Analisar oportunidade <LuArrowRight size={18} />
              </>
            )}
          </button>

          {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
        </form>
      </div>
    </div>
  );
}
