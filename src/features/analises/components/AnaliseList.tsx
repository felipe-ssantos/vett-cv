import { useEffect, useState } from "react";
import {
  LuChevronRight,
  LuClock,
  LuDownload,
  LuPlus,
  LuSearch,
  LuShieldCheck,
  LuSparkles,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { Link } from "react-router";
import { exportarHistoricoPdf } from "../../../lib/exportarPdf";
import { supabase } from "../../../lib/supabaseClient";
import cardStyles from "../../../styles/ui/Card.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import formStyles from "../../../styles/ui/Form.module.css";
import emptyStyles from "../../../styles/ui/EmptyState.module.css";
import motionStyles from "../../../styles/ui/Motion.module.css";
import pageStyles from "../../../styles/ui/Page.module.css";
import styles from "./AnaliseList.module.css";
import { ConfirmModal } from "./ConfirmModal";
import type { Analise } from "../../../types";

// Limite de análises salvas por usuário. Deve permanecer em sincronia com
// `v_limite` da migration 0005_limite_historico_analises.sql (25).
export const LIMITE_HISTORICO = 25;

export function AnaliseList() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do filtro personalizado
  const [filtro, setFiltro] = useState("");

  // Estados para modal / confirmação de exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<Analise | null>(null);
  const [confirmandoExcluirTodas, setConfirmandoExcluirTodas] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  // Estados para exportação: modo de seleção inline (checkboxes na lista)
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    () => new Set(),
  );
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro(null);

      // Filtra pelo usuário atual (sessão anônima) como camada extra de
      // isolamento — em conjunto com as políticas de RLS do Supabase, cada
      // visitante só vê as próprias análises.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase.from("analises").select("*");
      if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });
      if (cancelado) return;
      if (error) {
        setErro("Não foi possível carregar o histórico.");
        console.error(error);
      } else {
        setAnalises(data ?? []);
      }
      setCarregando(false);
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, []);

  async function handleExcluirUma() {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      const { data, error } = await supabase
        .from("analises")
        .delete()
        .eq("id", itemParaExcluir.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Não foi possível excluir no Supabase. Caso o RLS (Row Level Security) esteja ativado no Supabase, crie uma política (Policy) de DELETE na tabela 'analises'.",
        );
      }

      setAnalises((prev) => prev.filter((a) => a.id !== itemParaExcluir.id));
      setItemParaExcluir(null);
    } catch (err) {
      console.error("Erro ao excluir análise:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro ao excluir análise do banco de dados.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  async function handleExcluirTodas() {
    if (analises.length === 0) return;
    setExcluindo(true);
    try {
      const ids = analises.map((a) => a.id);
      const { data, error } = await supabase
        .from("analises")
        .delete()
        .in("id", ids)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          "Não foi possível excluir no Supabase. Caso o RLS (Row Level Security) esteja ativado no Supabase, crie uma política (Policy) de DELETE na tabela 'analises'.",
        );
      }

      setAnalises([]);
      setConfirmandoExcluirTodas(false);
    } catch (err) {
      console.error("Erro ao limpar histórico:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Erro ao excluir todo o histórico.",
      );
    } finally {
      setExcluindo(false);
    }
  }

  // Primeiro clique: entra no modo de seleção (checkboxes habilitados na
  // lista). Segundo clique: exporta apenas as análises marcadas. A seleção
  // não considera o filtro ativo, para o backup poder incluir qualquer
  // análise salva.
  async function handleExportarPdf() {
    if (!modoSelecao) {
      setSelecionadas(new Set());
      setModoSelecao(true);
      return;
    }
    if (selecionadas.size === 0) return;
    setExportando(true);
    try {
      await exportarHistoricoPdf(
        analises.filter((a) => selecionadas.has(a.id)),
      );
    } catch (err) {
      console.error("Falha ao exportar o histórico:", err);
    } finally {
      setExportando(false);
      setModoSelecao(false);
      setSelecionadas(new Set());
    }
  }

  function cancelarSelecao() {
    setModoSelecao(false);
    setSelecionadas(new Set());
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  function alternarTodas() {
    setSelecionadas(
      todasSelecionadas ? new Set() : new Set(analises.map((a) => a.id)),
    );
  }

  // Filtragem dinâmica por cargo, empresa, senioridade ou palavra-chave
  const analisesFiltradas = analises.filter((a) => {
    const termo = filtro.toLowerCase().trim();
    if (!termo) return true;
    return (
      a.titulo_vaga?.toLowerCase().includes(termo) ||
      a.empresa?.toLowerCase().includes(termo) ||
      a.senioridade?.toLowerCase().includes(termo) ||
      a.descricao_vaga?.toLowerCase().includes(termo)
    );
  });

  // Estado derivado: todas as análises estão marcadas?
  const todasSelecionadas =
    analises.length > 0 && selecionadas.size === analises.length;

  return (
    <div className={`${motionStyles.fadeInUp} ${pageStyles.wide}`}>
      {/* Header section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
            <LuClock className="text-teal" size={20} /> Histórico de Análises
          </h1>
          <p className={`mb-0 text-secondary ${styles.pageSubtitle}`}>
            Suas análises são privadas e vinculadas à sua sessão anônima.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {analises.length > 0 && (
            <>
              {modoSelecao ? (
                <>
                  <button
                    type="button"
                    onClick={handleExportarPdf}
                    disabled={exportando || selecionadas.size === 0}
                    className={`${buttonStyles.primary} ${buttonStyles.primaryCompact} px-3`}
                    title="Baixar em PDF as análises selecionadas"
                  >
                    <LuDownload size={14} />
                    {exportando
                      ? "Exportando..."
                      : `Exportar (${selecionadas.size})`}
                  </button>
                  <button
                    type="button"
                    onClick={cancelarSelecao}
                    disabled={exportando}
                    className={`btn btn-light border text-secondary btn-sm d-flex align-items-center gap-1 px-3 ${styles.clearHistoryButton}`}
                  >
                    <LuX size={14} /> Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleExportarPdf}
                  className={`btn btn-light border text-secondary btn-sm d-flex align-items-center gap-1 px-3 ${styles.exportButton}`}
                  title="Selecionar análises para exportar em PDF"
                >
                  <LuDownload size={14} /> Exportar PDF
                </button>
              )}
              <button
                onClick={() => setConfirmandoExcluirTodas(true)}
                className={`btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3 ${styles.clearHistoryButton}`}
              >
                <LuTrash2 size={14} /> Limpar histórico
              </button>
            </>
          )}
          <Link
            to="/"
            className={`${buttonStyles.primary} ${buttonStyles.primaryCompact} px-3 text-decoration-none`}
          >
            <LuPlus size={15} /> Nova análise
          </Link>
        </div>
      </div>

      {/* Indicador de uso do histórico: contador + barra de progresso + dica */}
      {!carregando && analises.length > 0 && (
        <div className={`${styles.historyMeter} mb-3`}>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span className={`${styles.infoBadge}`}>
              <LuShieldCheck size={13} aria-hidden="true" /> Privadas por sessão
            </span>
            <span
              className={`${styles.infoBadge} ${styles.infoBadgeMuted}`}
              role="status"
            >
              <LuClock size={13} aria-hidden="true" />
              {analises.length} de {LIMITE_HISTORICO} análises salvas
            </span>
          </div>
          <div
            className={styles.meterTrack}
            role="progressbar"
            aria-label="Análises salvas no histórico"
            aria-valuemin={0}
            aria-valuemax={LIMITE_HISTORICO}
            aria-valuenow={Math.min(analises.length, LIMITE_HISTORICO)}
          >
            <div
              className={`${styles.meterFill}${analises.length >= LIMITE_HISTORICO ? ` ${styles.meterFillFull}` : ""}`}
              style={{
                width: `${Math.min(100, (analises.length / LIMITE_HISTORICO) * 100)}%`,
              }}
            />
          </div>
          <p className={`mb-0 ${styles.meterHint}`}>
            {analises.length >= LIMITE_HISTORICO
              ? `Limite atingido: ao salvar uma nova análise, a mais antiga será removida automaticamente.`
              : `Você ainda pode salvar ${LIMITE_HISTORICO - analises.length} análise${LIMITE_HISTORICO - analises.length === 1 ? "" : "s"}. Quando o limite é atingido, a mais antiga sai automaticamente.`}
          </p>
        </div>
      )}

      {/* Input de Filtro Personalizado */}
      {!carregando && analises.length > 0 && (
        <div className="mb-3">
          <div className="position-relative">
            <input
              type="text"
              className={`form-control ${formStyles.textarea} ${styles.searchInput} py-2 pe-4`}
              placeholder="Pesquise em suas analises por cargo, empresa ou palavra-chave..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Pesquisar no histórico de análises"
            />
            <LuSearch
              className={`position-absolute top-50 translate-middle-y text-secondary ${styles.searchIcon}`}
              size={16}
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro("")}
                className={`btn btn-sm text-secondary position-absolute top-50 translate-middle-y border-0 p-1 ${styles.clearFilterIconButton}`}
                title="Limpar filtro"
                aria-label="Limpar filtro de pesquisa"
              >
                <LuX size={15} aria-hidden="true" />
              </button>
            )}
          </div>
          {filtro && (
            <div
              className={`mt-1 text-secondary ${styles.resultsCount}`}
              role="status"
            >
              Exibindo {analisesFiltradas.length} de {analises.length}{" "}
              resultados para "{filtro}".
            </div>
          )}
        </div>
      )}

      {/* Barra de seleção para exportação (modo ativado pelo botão Exportar) */}
      {modoSelecao && (
        <div className={`${styles.selecaoBarra} mb-3`}>
          <label className="d-flex align-items-center gap-2 mb-0">
            <input
              type="checkbox"
              checked={todasSelecionadas}
              onChange={alternarTodas}
            />
            <span className="fw-semibold">
              Selecionar todas ({analises.length})
            </span>
          </label>
          <span className="text-secondary" role="status">
            {selecionadas.size} de {analises.length} selecionadas
          </span>
        </div>
      )}

      {carregando && (
        <div className={emptyStyles.emptyState} role="status">
          <div className="spinner-border text-teal" aria-hidden="true" />
          <p className={`mt-3 text-secondary ${emptyStyles.loadingText}`}>
            Carregando histórico...
          </p>
        </div>
      )}

      {erro && <div className="alert alert-danger mb-4">{erro}</div>}

      {!carregando && !erro && analises.length === 0 && (
        <div className={emptyStyles.emptyState}>
          <div className={emptyStyles.emptyIcon}>
            <LuSparkles />
          </div>
          <h3 className="h6 fw-bold mb-2">Nenhuma análise salva ainda</h3>
          <p className={`text-secondary mb-4 ${emptyStyles.emptyText}`}>
            Realize sua primeira comparação de currículo com uma vaga para ver
            os resultados aqui.
          </p>
          <Link
            to="/"
            className={`${buttonStyles.primary} ${buttonStyles.primaryAuto} text-decoration-none px-4`}
          >
            Realizar análise
          </Link>
        </div>
      )}

      {!carregando && analises.length > 0 && analisesFiltradas.length === 0 && (
        <div className={`${emptyStyles.emptyState} ${emptyStyles.compact}`}>
          <p className={`text-secondary mb-2 ${styles.noResultsText}`}>
            Nenhuma análise encontrada para <strong>"{filtro}"</strong>.
          </p>
          <button
            onClick={() => setFiltro("")}
            className={`btn btn-sm btn-light border text-secondary ${styles.clearFilterButton}`}
          >
            Limpar filtro
          </button>
        </div>
      )}

      {!carregando && analisesFiltradas.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {analisesFiltradas.map((analise) => (
            <div
              key={analise.id}
              className={`${cardStyles.card} d-flex align-items-center justify-content-between p-3`}
            >
              <div className="d-flex align-items-center gap-3 flex-fill me-3">
                <input
                  type="checkbox"
                  className={`${styles.selecaoCheckbox} flex-shrink-0`}
                  disabled={!modoSelecao}
                  checked={selecionadas.has(analise.id)}
                  onChange={() => alternarSelecao(analise.id)}
                  aria-label={`Selecionar para exportar: ${analise.titulo_vaga}`}
                />
                <Link
                  to={`/analises/${analise.id}`}
                  className={`text-decoration-none flex-fill ${styles.itemLink}`}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className={`${cardStyles.iconCircle} ${cardStyles.iconCirclePrimary} ${cardStyles.iconCircleScore} flex-shrink-0`}
                    >
                      <span className={`fw-bold ${styles.scoreValue}`}>
                        {analise.score_match}%
                      </span>
                    </div>

                    <div>
                      <div className={`fw-bold text-dark ${styles.itemTitle}`}>
                        {analise.titulo_vaga}
                      </div>
                      <div className={`text-secondary ${styles.itemSubtitle}`}>
                        {analise.empresa ? `${analise.empresa} · ` : ""}
                        {new Date(analise.created_at).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Link
                  to={`/analises/${analise.id}`}
                  className={`btn btn-light btn-sm text-secondary d-flex align-items-center gap-1 ${styles.viewButton}`}
                >
                  Ver <LuChevronRight size={14} />
                </Link>
                <button
                  onClick={() => setItemParaExcluir(analise)}
                  className={`btn btn-outline-secondary btn-sm p-2 text-danger border-0 ${styles.deleteButton}`}
                  title="Excluir esta análise"
                  aria-label="Excluir esta análise"
                >
                  <LuTrash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Diálogo de Confirmação para Excluir UMA */}
      {itemParaExcluir && (
        <ConfirmModal
          titulo="Excluir análise?"
          descricao={
            <>
              Tem certeza que deseja excluir a análise para a vaga{" "}
              <strong>"{itemParaExcluir.titulo_vaga}"</strong>? Esta ação não
              pode ser desfeita.
            </>
          }
          rotuloConfirmar="Sim, excluir"
          rotuloEmProcessamento="Excluindo..."
          processando={excluindo}
          aoCancelar={() => setItemParaExcluir(null)}
          aoConfirmar={handleExcluirUma}
        />
      )}

      {/* Modal / Diálogo de Confirmação para Excluir TODAS */}
      {confirmandoExcluirTodas && (
        <ConfirmModal
          titulo="Excluir todo o histórico?"
          descricao={
            <>
              Tem certeza que deseja apagar{" "}
              <strong>todas as {analises.length} análises</strong> salvas? Esta
              ação removerá permanentemente o histórico do banco de dados.
            </>
          }
          rotuloConfirmar="Excluir tudo"
          rotuloEmProcessamento="Excluindo..."
          processando={excluindo}
          aoCancelar={() => setConfirmandoExcluirTodas(false)}
          aoConfirmar={handleExcluirTodas}
        />
      )}
    </div>
  );
}
