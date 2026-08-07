import { useEffect, useState } from "react";
import {
  LuChevronRight,
  LuClock,
  LuPlus,
  LuSearch,
  LuSparkles,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from "react-icons/lu";
import { Link } from "react-router";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

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

  return (
    <div className="fade-in-up" style={{ maxWidth: 920, margin: "0 auto" }}>
      {/* Header section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div>
          <h1 className="h5 fw-bold mb-0 d-flex align-items-center gap-2">
            <LuClock className="text-teal" size={20} /> Histórico de Análises
          </h1>
          <p className="mb-0 text-secondary" style={{ fontSize: 13 }}>
            Suas análises são privadas e vinculadas à sua sessão.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {analises.length > 0 && (
            <button
              onClick={() => setConfirmandoExcluirTodas(true)}
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3"
              style={{
                height: 36,
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <LuTrash2 size={14} /> Limpar histórico
            </button>
          )}
          <Link
            to="/"
            className="btn-vett-primary px-3 text-decoration-none"
            style={{ height: 36, borderRadius: 8, fontSize: 13 }}
          >
            <LuPlus size={15} /> Nova análise
          </Link>
        </div>
      </div>

      {/* Input de Filtro Personalizado */}
      {!carregando && analises.length > 0 && (
        <div className="mb-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control vett-textarea py-2 pe-4"
              style={{ paddingLeft: 38, height: 40, fontSize: 13.5 }}
              placeholder="Pesquise em suas analises por cargo, empresa ou palavra-chave..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
            <LuSearch
              className="position-absolute top-50 translate-middle-y text-secondary"
              style={{ left: 12 }}
              size={16}
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro("")}
                className="btn btn-sm text-secondary position-absolute top-50 translate-middle-y border-0 p-1"
                style={{ right: 8 }}
                title="Limpar filtro"
              >
                <LuX size={15} />
              </button>
            )}
          </div>
          {filtro && (
            <div className="mt-1 text-secondary" style={{ fontSize: 12 }}>
              Exibindo {analisesFiltradas.length} de {analises.length}{" "}
              resultados para "{filtro}".
            </div>
          )}
        </div>
      )}

      {carregando && (
        <div className="vett-empty-state">
          <div className="spinner-border text-teal" role="status" />
          <p className="mt-3 text-secondary" style={{ fontSize: 13 }}>
            Carregando histórico...
          </p>
        </div>
      )}

      {erro && <div className="alert alert-danger mb-4">{erro}</div>}

      {!carregando && !erro && analises.length === 0 && (
        <div className="vett-empty-state">
          <div className="vett-empty-icon">
            <LuSparkles />
          </div>
          <h3 className="h6 fw-bold mb-2">Nenhuma análise salva ainda</h3>
          <p
            className="text-secondary mb-4"
            style={{ fontSize: 13, maxWidth: 360 }}
          >
            Realize sua primeira comparação de currículo com uma vaga para ver
            os resultados aqui.
          </p>
          <Link
            to="/"
            className="btn-vett-primary text-decoration-none px-4"
            style={{ width: "auto", height: 38 }}
          >
            Realizar análise
          </Link>
        </div>
      )}

      {!carregando && analises.length > 0 && analisesFiltradas.length === 0 && (
        <div className="vett-empty-state" style={{ minHeight: 220 }}>
          <p className="text-secondary mb-2" style={{ fontSize: 14 }}>
            Nenhuma análise encontrada para <strong>"{filtro}"</strong>.
          </p>
          <button
            onClick={() => setFiltro("")}
            className="btn btn-sm btn-light border text-secondary"
            style={{ borderRadius: 6, fontSize: 13 }}
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
              className="vett-card d-flex align-items-center justify-content-between p-3"
            >
              <Link
                to={`/analises/${analise.id}`}
                className="text-decoration-none flex-fill me-3"
                style={{ color: "inherit" }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="vett-icon-circle vett-icon-circle--primary flex-shrink-0"
                    style={{ width: 40, height: 40, fontSize: 18 }}
                  >
                    <span className="fw-bold" style={{ fontSize: 14 }}>
                      {analise.score_match}%
                    </span>
                  </div>

                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: 15 }}>
                      {analise.titulo_vaga}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 12.5 }}>
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

              <div className="d-flex align-items-center gap-2">
                <Link
                  to={`/analises/${analise.id}`}
                  className="btn btn-light btn-sm text-secondary d-flex align-items-center gap-1"
                  style={{
                    borderRadius: 6,
                    fontSize: 12.5,
                    padding: "5px 10px",
                  }}
                >
                  Ver <LuChevronRight size={14} />
                </Link>
                <button
                  onClick={() => setItemParaExcluir(analise)}
                  className="btn btn-outline-secondary btn-sm p-2 text-danger border-0"
                  title="Excluir esta análise"
                  aria-label="Excluir esta análise"
                  style={{ borderRadius: 6 }}
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
                Tem certeza que deseja excluir a análise para a vaga{" "}
                <strong>"{itemParaExcluir.titulo_vaga}"</strong>? Esta ação não
                pode ser desfeita.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setItemParaExcluir(null)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 13.5 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirUma}
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

      {/* Modal / Diálogo de Confirmação para Excluir TODAS */}
      {confirmandoExcluirTodas && (
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
                <h2 className="h5 fw-bold mb-0">Excluir todo o histórico?</h2>
              </div>
              <p className="text-secondary mb-4" style={{ fontSize: 13.5 }}>
                Tem certeza que deseja apagar{" "}
                <strong>todas as {analises.length} análises</strong> salvas?
                Esta ação removerá permanentemente o histórico do banco de
                dados.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setConfirmandoExcluirTodas(false)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 13.5 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirTodas}
                  disabled={excluindo}
                  className="btn btn-danger px-4"
                  style={{ borderRadius: 8, fontSize: 13.5, fontWeight: 600 }}
                >
                  {excluindo ? "Excluindo..." : "Excluir tudo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
