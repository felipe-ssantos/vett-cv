import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
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
import { escreverTextoNaAreaDeTransferencia } from "../../../lib/areaTransferencia";
import cardStyles from "../../../styles/ui/Card.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import emptyStyles from "../../../styles/ui/EmptyState.module.css";
import statusStyles from "../../../styles/ui/Status.module.css";
import motionStyles from "../../../styles/ui/Motion.module.css";
import reportStyles from "../../../styles/ui/Report.module.css";
import pageStyles from "../../../styles/ui/Page.module.css";
import modalStyles from "../../../styles/ui/Modal.module.css";
import styles from "./AnaliseDetalhe.module.css";
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
    <div className={reportStyles.dimensionRow}>
      <div className={reportStyles.dimensionLabel}>
        <span className="text-secondary">{getCategoriaIcon(iconKey)}</span>
        <span>{label}</span>
      </div>
      <div className={reportStyles.dimensionBarWrapper}>
        <div className={reportStyles.dimensionTrack}>
          <div
            className={reportStyles.dimensionFill}
            style={{ width: `${valor}%` }}
          />
        </div>
      </div>
      <div className={reportStyles.dimensionScore}>{valor}/100</div>
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
    await escreverTextoNaAreaDeTransferencia(analise.descricao_vaga);
    setCopiadoDescricao(true);
    setTimeout(() => setCopiadoDescricao(false), 2000);
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
    const reduzirMovimento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: reduzirMovimento ? "auto" : "smooth",
    });
  }

  if (carregando) {
    return (
      <div className={emptyStyles.emptyState} role="status">
        <div className="spinner-border text-teal" aria-hidden="true" />
        <p className={`mt-3 text-secondary ${emptyStyles.loadingText}`}>
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
    <div className={`${motionStyles.fadeInUp} ${pageStyles.wide} ${styles.page}`}>
      {/* Top back navigation */}
      <div className="mb-3">
        <Link
          to="/historico"
          className={`text-decoration-none d-inline-flex align-items-center gap-1 text-secondary ${pageStyles.backLink}`}
        >
          <LuArrowLeft size={15} /> Voltar ao histórico
        </Link>
      </div>

      {/* Card da vaga */}
      <div className={`${cardStyles.card} mb-3`}>
        <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <h1 className="h5 fw-bold mb-1">{analise.titulo_vaga}</h1>
            {analise.empresa && (
              <p className={`mb-0 text-secondary ${styles.jobMeta}`}>
                {analise.empresa}
              </p>
            )}
          </div>
          {analise.senioridade && (
            <span className={`badge bg-light text-dark border px-3 py-1 ${styles.seniorityBadge}`}>
              {analise.senioridade}
            </span>
          )}
        </div>

        {(analise.hard_skills.length > 0 || analise.soft_skills.length > 0) && (
          <div className={`mt-1 text-tertiary ${styles.skillsLine}`}>
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
            className={`btn btn-light border text-dark fw-semibold d-flex align-items-center justify-content-between w-100 px-3 py-2 ${styles.summaryButton}`}
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
              className={`${styles.chevron}${descricaoAberta ? ` ${styles.chevronOpen}` : ""}`}
            />
          </summary>

          <div
            className={`mt-2 p-3 rounded position-relative ${styles.descriptionPanel}`}
          >
            <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
              <span className={`fw-semibold text-secondary ${styles.descriptionTitle}`}>
                Descrição da oportunidade
              </span>
              <button
                type="button"
                onClick={handleCopiarDescricao}
                className={`btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1 ${styles.copyButton}`}
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
            <p className={`mb-0 ${styles.descriptionText}`}>
              {analise.descricao_vaga}
            </p>
          </div>
        </details>
      </div>

      {/* Top Score Box */}
      <div className={`${cardStyles.card} mb-3`}>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h2 className="h6 fw-bold mb-0">Sua análise</h2>
          {tempoAnaliseSegundos != null && (
            <span className={statusStyles.statusPill}>
              <LuCheck size={14} />
              Análise concluída em {tempoAnaliseSegundos.toFixed(1)}s
            </span>
          )}
        </div>

        <div className={reportStyles.scoreHeader}>
          <div className={reportStyles.scoreNumberGroup}>
            <span className={reportStyles.scoreNumber}>
              {analise.score_match}
            </span>
            <span className={reportStyles.scoreMax}>/100</span>
          </div>
          <div className={reportStyles.scoreInfo}>
            <h3 className={reportStyles.scoreTitle}>
              {classificarScore(analise.score_match)}
            </h3>
            <p className={reportStyles.scoreDescription}>{analise.resumo_ia}</p>
          </div>
        </div>

        {/* Progress scale bar with markers 0 - 50 - 100 */}
        <div className={reportStyles.scaleContainer}>
          <div className={reportStyles.scaleTrack}>
            <div
              className={reportStyles.scaleFill}
              style={{ width: `${analise.score_match}%` }}
            />
          </div>
          <div className={reportStyles.scaleLabels}>
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
            <div className={`${cardStyles.card} h-100`}>
              <h3 className={`h6 fw-bold mb-3 ${reportStyles.sectionTitle}`}>
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
          <div className={`${cardStyles.card} flex-fill`}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCircleSuccess}`}
              >
                <LuThumbsUp />
              </div>
              <h3 className={`h6 fw-bold mb-0 text-dark ${reportStyles.sectionTitleCompact}`}>
                O que joga a seu favor
              </h3>
            </div>
            <ul className={reportStyles.evidenceList}>
              {analise.keywords_presentes.map((k) => (
                <li key={k} className={reportStyles.evidenceItem}>
                  <span
                    className={`${reportStyles.evidenceIcon} ${reportStyles.evidenceIconFavor}`}
                  >
                    <LuCheck />
                  </span>
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lacuna */}
          <div className={`${cardStyles.card} flex-fill`}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCircleWarning}`}
              >
                <LuTriangleAlert />
              </div>
              <h3 className={`h6 fw-bold mb-0 text-dark ${reportStyles.sectionTitleCompact}`}>
                Onde existe uma lacuna
              </h3>
            </div>
            <ul className={reportStyles.evidenceList}>
              {analise.keywords_faltando.map((k) => (
                <li key={k} className={reportStyles.evidenceItem}>
                  <span
                    className={`${reportStyles.evidenceIcon} ${reportStyles.evidenceIconLacuna}`}
                  >
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
          <div className={`${cardStyles.card} h-100`}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm}`}
              >
                <LuClipboardList />
              </div>
              <h3 className={`h6 fw-bold mb-0 ${reportStyles.sectionTitle}`}>
                Antes de aplicar
              </h3>
            </div>
            <ol className={reportStyles.numberedList}>
              {analise.sugestoes_ajuste.map((sugestao, index) => (
                <li key={index} className={reportStyles.numberedItem}>
                  <span className={reportStyles.numberedBadge}>
                    {index + 1}
                  </span>
                  <span>{sugestao}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Insight */}
        <div className="col-md-6">
          <div className={`${cardStyles.card} h-100`}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCirclePrimary}`}
              >
                <LuLightbulb />
              </div>
              <h3 className={`h6 fw-bold mb-0 ${reportStyles.sectionTitle}`}>
                Insight
              </h3>
            </div>
            <p className={`mb-0 text-secondary ${reportStyles.insightText}`}>
              {analise.dica_final}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons footer with Voltar ao topo */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top mt-4 mb-4">
        <button
          onClick={scrollToTop}
          className={`btn btn-light text-secondary d-inline-flex align-items-center gap-2 ${styles.actionButton}`}
        >
          <LuArrowUp size={16} /> Voltar ao topo
        </button>

        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => setConfirmandoExclusao(true)}
            className={`btn btn-outline-danger d-inline-flex align-items-center gap-2 px-3 ${styles.actionButton}`}
          >
            <LuTrash2 size={15} /> Excluir análise
          </button>

          <Link
            to={`/analises/${analise.id}/reanalisar`}
            className={`${buttonStyles.primary} ${styles.actionLink} text-decoration-none px-3`}
          >
            <LuRotateCw size={15} /> Reanalisar
          </Link>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmandoExclusao && (
        <div
          className={`modal fade show d-block ${modalStyles.backdrop}`}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-detalhe-excluir-titulo"
          aria-describedby="modal-detalhe-excluir-desc"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className={`modal-content ${cardStyles.card} border-0 p-4`}>
              <div className="d-flex align-items-center gap-3 mb-3">
                <div
                  className={`${cardStyles.iconCircle} ${cardStyles.iconCircleWarning}`}
                >
                  <LuTriangleAlert aria-hidden="true" />
                </div>
                <h2
                  className="h5 fw-bold mb-0"
                  id="modal-detalhe-excluir-titulo"
                >
                  Excluir análise?
                </h2>
              </div>
              <p
                className={`text-secondary mb-4 ${modalStyles.modalText}`}
                id="modal-detalhe-excluir-desc"
              >
                Tem certeza que deseja excluir esta análise para{" "}
                <strong>"{analise.titulo_vaga}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setConfirmandoExclusao(false)}
                  disabled={excluindo}
                  autoFocus
                  className={`btn btn-light px-3 ${modalStyles.modalButtonLight}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluir}
                  disabled={excluindo}
                  className={`btn btn-danger px-4 ${modalStyles.modalButtonDanger}`}
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
