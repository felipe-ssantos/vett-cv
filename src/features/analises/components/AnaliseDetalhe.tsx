import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuCheck,
  LuUser,
  LuStar,
  LuWrench,
  LuGlobe,
  LuCircleAlert,
  LuClipboardList,
  LuLightbulb,
  LuTrash2,
  LuRotateCw,
  LuTriangleAlert,
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
      return <LuUser size={16} />;
    case "competencias":
    case "skills_tecnicas":
      return <LuStar size={16} />;
    case "ferramentas":
      return <LuWrench size={16} />;
    case "contexto_vaga":
    case "contexto":
    case "soft_skills":
    default:
      return <LuGlobe size={16} />;
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

function DimensaoBarra({ label, valor, iconKey }: { label: string; valor: number; iconKey: string }) {
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

  async function handleExcluir() {
    if (!id) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("analises")
        .delete()
        .eq("id", id);

      if (error) throw error;

      navigate("/historico");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir esta análise.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <div className="vett-empty-state">
        <div className="spinner-border text-teal" role="status" />
        <p className="mt-3 text-secondary">Carregando análise...</p>
      </div>
    );
  }

  if (erro || !analise) {
    return <div className="alert alert-danger">{erro ?? "Análise não encontrada."}</div>;
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Top back navigation */}
      <div className="mb-4">
        <Link
          to="/historico"
          className="text-decoration-none d-inline-flex align-items-center gap-1 text-secondary"
          style={{ fontSize: 14, fontWeight: 500 }}
        >
          <LuArrowLeft size={16} /> Voltar ao histórico
        </Link>
      </div>

      {/* Card da vaga */}
      <div className="vett-card mb-4">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h1 className="h4 fw-bold mb-1">{analise.titulo_vaga}</h1>
            {analise.empresa && (
              <p className="mb-0 text-secondary" style={{ fontSize: 14 }}>
                {analise.empresa}
              </p>
            )}
          </div>
          {analise.senioridade && (
            <span
              className="badge bg-light text-dark border px-3 py-2"
              style={{ fontSize: 13, borderRadius: 20 }}
            >
              {analise.senioridade}
            </span>
          )}
        </div>

        {(analise.hard_skills.length > 0 || analise.soft_skills.length > 0) && (
          <div className="mt-2 text-tertiary" style={{ fontSize: 13 }}>
            {[...analise.hard_skills, ...analise.soft_skills].join(" · ")}
          </div>
        )}

        <details className="mt-3" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
          <summary style={{ cursor: "pointer", color: "var(--primary)", fontWeight: 600 }}>
            Ver descrição completa da vaga
          </summary>
          <p className="mt-2 p-3 rounded" style={{ whiteSpace: "pre-wrap", background: "var(--surface-alt)", border: "1px solid var(--border)" }}>
            {analise.descricao_vaga}
          </p>
        </details>
      </div>

      {/* Top Score Box */}
      <div className="vett-card mb-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2 className="h5 fw-bold mb-0">Sua análise</h2>
          {tempoAnaliseSegundos != null && (
            <span className="vett-status-pill">
              <LuCheck size={15} />
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
      <div className="row g-4 mb-4">
        {/* Onde você se encaixa */}
        {analise.match_por_categoria && (
          <div className="col-md-7">
            <div className="vett-card h-100">
              <h3 className="h6 fw-bold mb-4">Onde você se encaixa</h3>
              {Object.entries(analise.match_por_categoria).map(([chave, valor]) => (
                <DimensaoBarra
                  key={chave}
                  iconKey={chave}
                  label={LABELS_CATEGORIA[chave] ?? chave}
                  valor={valor as number}
                />
              ))}
            </div>
          </div>
        )}

        {/* Favor & Lacuna */}
        <div className={analise.match_por_categoria ? "col-md-5 d-flex flex-column gap-3" : "col-12 d-flex flex-column gap-3"}>
          {/* Favor */}
          <div className="vett-card flex-fill">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="vett-icon-circle vett-icon-circle--success" style={{ width: 28, height: 28, fontSize: 14 }}>
                <LuCheck />
              </div>
              <h3 className="h6 fw-bold mb-0">O que joga a seu favor</h3>
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
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="vett-icon-circle vett-icon-circle--warning" style={{ width: 28, height: 28, fontSize: 14 }}>
                <LuCircleAlert />
              </div>
              <h3 className="h6 fw-bold mb-0">Onde existe uma lacuna</h3>
            </div>
            <ul className="vett-evidence-list">
              {analise.keywords_faltando.map((k) => (
                <li key={k} className="vett-evidence-item">
                  <span className="vett-evidence-icon vett-evidence-icon--lacuna">
                    <LuCircleAlert />
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom row: Antes de aplicar & Insight */}
      <div className="row g-4 mb-4">
        {/* Antes de aplicar */}
        <div className="col-md-7">
          <div className="vett-card h-100">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="vett-icon-circle" style={{ width: 28, height: 28, fontSize: 14 }}>
                <LuClipboardList />
              </div>
              <h3 className="h6 fw-bold mb-0">Antes de aplicar</h3>
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
        <div className="col-md-5">
          <div className="vett-card h-100">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="vett-icon-circle vett-icon-circle--primary" style={{ width: 28, height: 28, fontSize: 14 }}>
                <LuLightbulb />
              </div>
              <h3 className="h6 fw-bold mb-0">Insight</h3>
            </div>
            <p className="mb-0 text-secondary" style={{ fontSize: 14, lineHeight: 1.5 }}>
              {analise.dica_final}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons footer */}
      <div className="d-flex justify-content-between align-items-center pt-2">
        <button
          onClick={() => setConfirmandoExclusao(true)}
          className="btn btn-outline-danger d-inline-flex align-items-center gap-2 px-3"
          style={{ height: 44, borderRadius: 10, fontWeight: 600, fontSize: 14 }}
        >
          <LuTrash2 size={16} /> Excluir esta análise
        </button>

        <Link
          to={`/analises/${analise.id}/reanalisar`}
          className="btn-vett-primary text-decoration-none px-4"
          style={{ width: "auto", height: 44 }}
        >
          <LuRotateCw size={16} /> Reanalisar com outro currículo
        </Link>
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
              <p className="text-secondary mb-4" style={{ fontSize: 14 }}>
                Tem certeza que deseja excluir esta análise para <strong>"{analise.titulo_vaga}"</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={excluindo}
                  className="btn btn-danger px-4"
                  style={{ borderRadius: 8, fontSize: 14, fontWeight: 600 }}
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
