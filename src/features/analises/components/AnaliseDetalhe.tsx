import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuArrowUp,
  LuCheck,
  LuCopy,
  LuUser,
  LuStar,
  LuWrench,
  LuGlobe,
  LuClipboardList,
  LuLightbulb,
  LuTrash2,
  LuRotateCw,
  LuTriangleAlert,
  LuThumbsUp,
  LuEye,
  LuChevronDown,
} from "react-icons/lu";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

function classificarScore(score: number): string {
  if (score < 40) return "Baixa compatibilidade";
  if (score < 60) return "Compatibilidade moderada";
  if (score < 80) return "Boa compatibilidade";
  return "Forte compatibilidade";
}

function getCategoriaIcon(chave: string) {
  switch (chave) {
    case "experiencia":
      return <LuUser size={15} />;
    case "competencias":
    case "skills_tecnicas":
      return <LuStar size={15} />;
    case "ferramentas":
      return <LuWrench size={15} />;
    case "contexto_vaga":
    case "contexto":
    case "soft_skills":
    default:
      return <LuGlobe size={15} />;
  }
}

const LABELS_CATEGORIA: Record<string, string> = {
  experiencia: "Experiência",
  skills_tecnicas: "Competências",
  competencias: "Competências",
  ferramentas: "Ferramentas",
  contexto_vaga: "Contexto da vaga",
  soft_skills: "Contexto da vaga",
};

function DimensaoBarra({
  label,
  valor,
  iconKey,
}: {
  label: string;
  valor: number;
  iconKey: string;
}) {
  return (
    <div className="vett-dimension-row">
      <div className="vett-dimension-label">
        <span className="text-secondary">{getCategoriaIcon(iconKey)}</span>
        <span>{label}</span>
      </div>
      <div className="vett-dimension-bar-wrapper">
        <div className="vett-dimension-track">
          <div className="vett-dimension-fill" style={{ width: `${valor}%` }} />
        </div>
      </div>
      <div className="vett-dimension-score">{valor}/100</div>
    </div>
  );
}

export function AnaliseDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tempoAnaliseSegundos = (
    location.state as { tempoAnaliseSegundos?: number } | null
  )?.tempoAnaliseSegundos;

  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [descricaoAberta, setDescricaoAberta] = useState(false);
  const [copiadoDescricao, setCopiadoDescricao] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    async function carregarAnalise() {
      const { data, error } = await supabase
        .from("analises")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErro("Não foi possível carregar a análise.");
      } else {
        setAnalise(data);
      }
      setCarregando(false);
    }
    if (id) carregarAnalise();
  }, [id]);

  async function handleCopiarDescricao() {
    if (!analise?.descricao_vaga) return;
    try {
      await navigator.clipboard.writeText(analise.descricao_vaga);
      setCopiadoDescricao(true);
      setTimeout(() => setCopiadoDescricao(false), 2000);
    } catch (err) {
      console.error("Falha ao copiar:", err);
    }
  }

  async function handleExcluir() {
    if (!id) return;
    setExcluindo(true);
    try {
      const { data, error } = await supabase
        .from("analises")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Não foi possível excluir no Supabase. Caso o RLS (Row Level Security) esteja ativado no Supabase, crie uma política (Policy) de DELETE na tabela 'analises'.",
        );
      }

      navigate("/historico");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro ao excluir esta análise.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (carregando) {
    return (
      <div className="vett-empty-state">
        <div className="spinner-border text-teal" role="status" />
        <p className="mt-3 text-secondary" style={{ fontSize: 13 }}>
          Carregando análise...
        </p>
      </div>
    );
  }

  if (erro || !analise) {
    return (
      <div className="alert alert-danger">
        {erro ?? "Análise não encontrada."}
      </div>
    );
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: 920, margin: "0 auto" }}>
      {/* Top back navigation */}
      <div className="mb-3">
        <Link
          to="/historico"
          className="text-decoration-none d-inline-flex align-items-center gap-1 text-secondary"
          style={{ fontSize: 13, fontWeight: 500 }}
        >
          <LuArrowLeft size={15} /> Voltar ao histórico
        </Link>
      </div>

      {/* Card da vaga */}
      <div className="vett-card mb-3">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h1 className="h5 fw-bold mb-1">{analise.titulo_vaga}</h1>
            {analise.empresa && (
              <p className="mb-0 text-secondary" style={{ fontSize: 13 }}>
                {analise.empresa}
              </p>
            )}
          </div>
          {analise.senioridade && (
            <span
              className="badge bg-light text-dark border px-3 py-1"
              style={{ fontSize: 12, borderRadius: 20 }}
            >
              {analise.senioridade}
            </span>
          )}
        </div>

        {(analise.hard_skills.length > 0 || analise.soft_skills.length > 0) && (
          <div className="mt-1 text-tertiary" style={{ fontSize: 12.5 }}>
            {[...analise.hard_skills, ...analise.soft_skills].join(" · ")}
          </div>
        )}

        {/* Botão em destaque para usuários leigos verem a descrição */}
        <details
          className="mt-3"
          onToggle={(e) =>
            setDescricaoAberta((e.target as HTMLDetailsElement).open)
          }
        >
          <summary
            className="btn btn-light border text-dark fw-semibold d-flex align-items-center justify-content-between w-100 px-3 py-2"
            style={{
              borderRadius: 8,
              fontSize: 13,
              cursor: "pointer",
              background: "var(--surface-alt)",
            }}
          >
            <span className="d-inline-flex align-items-center gap-2">
              <LuEye size={16} className="text-teal" />
              <span>
                {descricaoAberta
                  ? "Ocultar descrição da vaga"
                  : "Ver descrição completa da vaga"}
              </span>
            </span>
            <LuChevronDown
              size={16}
              style={{
                transform: descricaoAberta ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
              }}
            />
          </summary>

          <div
            className="mt-2 p-3 rounded position-relative"
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
              <span className="fw-semibold text-secondary" style={{ fontSize: 12 }}>
                Descrição da oportunidade
              </span>
              <button
                type="button"
                onClick={handleCopiarDescricao}
                className="btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1"
                style={{ fontSize: 12, borderRadius: 6, padding: "3px 10px" }}
              >
                {copiadoDescricao ? (
                  <>
                    <LuCheck size={13} className="text-success" /> Copiado!
                  </>
                ) : (
                  <>
                    <LuCopy size={13} /> Copiar descrição
                  </>
                )}
              </button>
            </div>
            <p className="mb-0" style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
              {analise.descricao_vaga}
            </p>
          </div>
        </details>
      </div>

      {/* Top Score Box */}
      <div className="vett-card mb-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h2 className="h6 fw-bold mb-0">Sua análise</h2>
          {tempoAnaliseSegundos != null && (
            <span className="vett-status-pill">
              <LuCheck size={14} />
              Análise concluída em {tempoAnaliseSegundos.toFixed(1)}s
            </span>
          )}
        </div>

        <div className="vett-score-header">
          <div className="vett-score-number-group">
            <span className="vett-score-number">{analise.score_match}</span>
            <span className="vett-score-max">/100</span>
          </div>
          <div className="vett-score-info">
            <h3 className="vett-score-title">
              {classificarScore(analise.score_match)}
            </h3>
            <p className="vett-score-description">{analise.resumo_ia}</p>
          </div>
        </div>

        {/* Progress scale bar with markers 0 - 50 - 100 */}
        <div className="vett-scale-container">
          <div className="vett-scale-track">
            <div
              className="vett-scale-fill"
              style={{ width: `${analise.score_match}%` }}
            />
          </div>
          <div className="vett-scale-labels">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Sub-cards: Onde você se encaixa / Favor / Lacuna */}
      <div className="row g-3 mb-3">
        {/* Onde você se encaixa */}
        {analise.match_por_categoria && (
          <div className="col-md-6">
            <div className="vett-card h-100">
              <h3 className="h6 fw-bold mb-3" style={{ fontSize: 14 }}>
                Onde você se encaixa
              </h3>
              {Object.entries(analise.match_por_categoria).map(
                ([chave, valor]) => (
                  <DimensaoBarra
                    key={chave}
                    iconKey={chave}
                    label={LABELS_CATEGORIA[chave] ?? chave}
                    valor={valor as number}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {/* Favor & Lacuna */}
        <div
          className={
            analise.match_por_categoria
              ? "col-md-6 d-flex flex-column gap-3"
              : "col-12 d-flex flex-column gap-3"
          }
        >
          {/* Favor */}
          <div className="vett-card flex-fill">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="vett-icon-circle vett-icon-circle--success"
                style={{ width: 26, height: 26, fontSize: 13 }}
              >
                <LuThumbsUp />
              </div>
              <h3
                className="h6 fw-bold mb-0 text-dark"
                style={{ fontSize: 14, lineHeight: 1 }}
              >
                O que joga a seu favor
              </h3>
            </div>
            <ul className="vett-evidence-list">
              {analise.keywords_presentes.map((k) => (
                <li key={k} className="vett-evidence-item">
                  <span className="vett-evidence-icon vett-evidence-icon--favor">
                    <LuCheck />
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lacuna */}
          <div className="vett-card flex-fill">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="vett-icon-circle vett-icon-circle--warning"
                style={{ width: 26, height: 26, fontSize: 13 }}
              >
                <LuTriangleAlert />
              </div>
              <h3
                className="h6 fw-bold mb-0 text-dark"
                style={{ fontSize: 14, lineHeight: 1 }}
              >
                Onde existe uma lacuna
              </h3>
            </div>
            <ul className="vett-evidence-list">
              {analise.keywords_faltando.map((k) => (
                <li key={k} className="vett-evidence-item">
                  <span className="vett-evidence-icon vett-evidence-icon--lacuna">
                    <LuTriangleAlert />
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom row: Antes de aplicar & Insight */}
      <div className="row g-3 mb-3">
        {/* Antes de aplicar */}
        <div className="col-md-6">
          <div className="vett-card h-100">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="vett-icon-circle"
                style={{ width: 26, height: 26, fontSize: 13 }}
              >
                <LuClipboardList />
              </div>
              <h3 className="h6 fw-bold mb-0" style={{ fontSize: 14 }}>
                Antes de aplicar
              </h3>
            </div>
            <ol className="vett-numbered-list">
              {analise.sugestoes_ajuste.map((sugestao, index) => (
                <li key={index} className="vett-numbered-item">
                  <span className="vett-number-badge">{index + 1}</span>
                  <span>{sugestao}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Insight */}
        <div className="col-md-6">
          <div className="vett-card h-100">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className="vett-icon-circle vett-icon-circle--primary"
                style={{ width: 26, height: 26, fontSize: 13 }}
              >
                <LuLightbulb />
              </div>
              <h3 className="h6 fw-bold mb-0" style={{ fontSize: 14 }}>
                Insight
              </h3>
            </div>
            <p
              className="mb-0 text-secondary"
              style={{ fontSize: 13, lineHeight: 1.45 }}
            >
              {analise.dicaFinal}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons footer with Voltar ao topo */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top mt-4 mb-4">
        <button
          onClick={scrollToTop}
          className="btn btn-light text-secondary d-inline-flex align-items-center gap-2"
          style={{ height: 38, borderRadius: 8, fontSize: 13, fontWeight: 600 }}
        >
          <LuArrowUp size={16} /> Voltar ao topo
        </button>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => setConfirmandoExclusao(true)}
            className="btn btn-outline-danger d-inline-flex align-items-center gap-2 px-3"
            style={{ height: 38, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
          >
            <LuTrash2 size={15} /> Excluir análise
          </button>

          <Link
            to={`/analises/${analise.id}/reanalisar`}
            className="btn-vett-primary text-decoration-none px-3"
            style={{ width: "auto", height: 38, fontSize: 13 }}
          >
            <LuRotateCw size={15} /> Reanalisar
          </Link>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmandoExclusao && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(0, 0, 0, 0.4)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content vett-card border-0 p-4">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="vett-icon-circle vett-icon-circle--warning">
                  <LuTriangleAlert />
                </div>
                <h2 className="h5 fw-bold mb-0">Excluir análise?</h2>
              </div>
              <p className="text-secondary mb-4" style={{ fontSize: 13.5 }}>
                Tem certeza que deseja excluir esta análise para{" "}
                <strong>"{analise.titulo_vaga}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 13.5 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={excluindo}
                  className="btn btn-danger px-4"
                  style={{ borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
                >
                  {excluindo ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
