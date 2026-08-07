import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import {
  LuArrowLeft,
  LuArrowUp,
  LuCheck,
  LuCopy,
  LuTrash2,
  LuRotateCw,
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
import pageStyles from "../../../styles/ui/Page.module.css";
import styles from "./AnaliseDetalhe.module.css";
import { mapearParaRelatorio } from "../lib/mapearParaRelatorio";
import { ConfirmModal } from "./ConfirmModal";
import { RelatorioAnalise } from "./RelatorioAnalise";
import type { Analise } from "../../../types";

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

  const analiseRelatorio = mapearParaRelatorio(analise);

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

      {/* Relatório reutilizável (mesmo componente do AnaliseWorkspace) */}
      <RelatorioAnalise
        analise={analiseRelatorio}
        cabecalho={
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h2 className="h6 fw-bold mb-0">Sua análise</h2>
            {tempoAnaliseSegundos != null && (
              <span className={statusStyles.statusPill}>
                <LuCheck size={14} />
                Análise concluída em {tempoAnaliseSegundos.toFixed(1)}s
              </span>
            )}
          </div>
        }
      />

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
        <ConfirmModal
          titulo="Excluir análise?"
          descricao={
            <>
              Tem certeza que deseja excluir esta análise para{" "}
              <strong>"{analise.titulo_vaga}"</strong>? Esta ação não pode ser
              desfeita.
            </>
          }
          rotuloConfirmar="Sim, excluir"
          rotuloEmProcessamento="Excluindo..."
          processando={excluindo}
          aoCancelar={() => setConfirmandoExclusao(false)}
          aoConfirmar={handleExcluir}
        />
      )}
    </div>
  );
}
