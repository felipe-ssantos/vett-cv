import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuClock,
  LuTrash2,
  LuPlus,
  LuTriangleAlert,
  LuChevronRight,
  LuSparkles,
} from "react-icons/lu";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

export function AnaliseList() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estados para modal / confirmação de exclusão
  const [itemParaExcluir, setItemParaExcluir] = useState<Analise | null>(null);
  const [confirmandoExcluirTodas, setConfirmandoExcluirTodas] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarAnalises();
  }, []);

  async function carregarAnalises() {
    setCarregando(true);
    setErro(null);
    const { data, error } = await supabase
      .from("analises")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setErro("Não foi possível carregar o histórico.");
      console.error(error);
    } else {
      setAnalises(data ?? []);
    }
    setCarregando(false);
  }

  async function handleExcluirUma() {
    if (!itemParaExcluir) return;
    setExcluindo(true);
    try {
      const { error } = await supabase
        .from("analises")
        .delete()
        .eq("id", itemParaExcluir.id);

      if (error) {
        throw error;
      }
      setAnalises((prev) => prev.filter((a) => a.id !== itemParaExcluir.id));
      setItemParaExcluir(null);
    } catch (err) {
      console.error("Erro ao excluir análise:", err);
      alert("Erro ao excluir análise do banco de dados.");
    } finally {
      setExcluindo(false);
    }
  }

  async function handleExcluirTodas() {
    if (analises.length === 0) return;
    setExcluindo(true);
    try {
      const ids = analises.map((a) => a.id);
      const { error } = await supabase
        .from("analises")
        .delete()
        .in("id", ids);

      if (error) {
        throw error;
      }
      setAnalises([]);
      setConfirmandoExcluirTodas(false);
    } catch (err) {
      console.error("Erro ao limpar histórico:", err);
      alert("Erro ao excluir todo o histórico do banco de dados.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="fade-in-up" style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header section */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1 d-flex align-items-center gap-2">
            <LuClock className="text-teal" size={22} /> Histórico de Análises
          </h1>
          <p className="mb-0 text-secondary" style={{ fontSize: 14 }}>
            Suas análises são privadas e vinculadas à sua sessão.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {analises.length > 0 && (
            <button
              onClick={() => setConfirmandoExcluirTodas(true)}
              className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 px-3"
              style={{ height: 38, borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              <LuTrash2 size={15} /> Limpar histórico
            </button>
          )}
          <Link
            to="/"
            className="btn-vett-primary px-3 text-decoration-none"
            style={{ height: 38, borderRadius: 8, fontSize: 13 }}
          >
            <LuPlus size={16} /> Nova análise
          </Link>
        </div>
      </div>

      {carregando && (
        <div className="vett-empty-state">
          <div className="spinner-border text-teal" role="status" />
          <p className="mt-3 text-secondary" style={{ fontSize: 14 }}>
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
          <p className="text-secondary mb-4" style={{ fontSize: 14, maxWidth: 360 }}>
            Realize sua primeira comparação de currículo com uma vaga para ver os resultados aqui.
          </p>
          <Link to="/" className="btn-vett-primary text-decoration-none px-4" style={{ width: "auto" }}>
            Realizar análise
          </Link>
        </div>
      )}

      {!carregando && analises.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {analises.map((analise) => (
            <div
              key={analise.id}
              className="vett-card d-flex align-items-center justify-content-between p-3"
              style={{ transition: "border-color 150ms ease, box-shadow 150ms ease" }}
            >
              <Link
                to={`/analises/${analise.id}`}
                className="text-decoration-none flex-fill me-3"
                style={{ color: "inherit" }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="vett-icon-circle vett-icon-circle--primary flex-shrink-0"
                    style={{ width: 44, height: 44, fontSize: 20 }}
                  >
                    <span className="fw-bold" style={{ fontSize: 15 }}>
                      {analise.score_match}%
                    </span>
                  </div>

                  <div>
                    <div className="fw-bold text-dark" style={{ fontSize: 16 }}>
                      {analise.titulo_vaga}
                    </div>
                    <div className="text-secondary" style={{ fontSize: 13 }}>
                      {analise.empresa ? `${analise.empresa} · ` : ""}
                      {new Date(analise.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </Link>

              <div className="d-flex align-items-center gap-2">
                <Link
                  to={`/analises/${analise.id}`}
                  className="btn btn-light btn-sm text-secondary d-flex align-items-center gap-1"
                  style={{ borderRadius: 6, fontSize: 13, padding: "6px 12px" }}
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
                  <LuTrash2 size={17} />
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
              <p className="text-secondary mb-4" style={{ fontSize: 14 }}>
                Tem certeza que deseja excluir a análise para a vaga{" "}
                <strong>"{itemParaExcluir.titulo_vaga}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setItemParaExcluir(null)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirUma}
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
              <p className="text-secondary mb-4" style={{ fontSize: 14 }}>
                Tem certeza que deseja apagar <strong>todas as {analises.length} análises</strong> salvas?
                Esta ação removerá permanentemente o histórico.
              </p>
              <div className="d-flex justify-content-end gap-2">
                <button
                  onClick={() => setConfirmandoExcluirTodas(false)}
                  disabled={excluindo}
                  className="btn btn-light px-3"
                  style={{ borderRadius: 8, fontSize: 14 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExcluirTodas}
                  disabled={excluindo}
                  className="btn btn-danger px-4"
                  style={{ borderRadius: 8, fontSize: 14, fontWeight: 600 }}
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
