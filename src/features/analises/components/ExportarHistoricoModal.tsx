import { useId, useState } from "react";
import { LuDownload } from "react-icons/lu";
import type { Analise } from "../../../types";
import cardStyles from "../../../styles/ui/Card.module.css";
import modalStyles from "../../../styles/ui/Modal.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import styles from "./ExportarHistoricoModal.module.css";

interface ExportarHistoricoModalProps {
  /** Análises disponíveis, já ordenadas da mais recente para a mais antiga. */
  analises: Analise[];
  aoConfirmar: (selecionadas: Analise[]) => void;
  aoCancelar: () => void;
  processando?: boolean;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Diálogo de exportação do histórico: o usuário marca (checkbox) exatamente
 * quais análises deseja exportar, com a opção de selecionar todas. Componente
 * presentacional — recebe a lista e o callback com as análises selecionadas.
 */
export function ExportarHistoricoModal({
  analises,
  aoConfirmar,
  aoCancelar,
  processando = false,
}: ExportarHistoricoModalProps) {
  // Por padrão todas ficam marcadas (mesmo comportamento de exportar tudo);
  // o usuário desmarca as que não quer incluir no PDF.
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    () => new Set(analises.map((a) => a.id)),
  );
  const tituloId = useId();
  const descricaoId = useId();

  const todasSelecionadas = selecionadas.size === analises.length;

  function alternarTodas() {
    setSelecionadas(
      todasSelecionadas ? new Set() : new Set(analises.map((a) => a.id)),
    );
  }

  function alternarUma(id: string) {
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

  function handleConfirmar() {
    aoConfirmar(analises.filter((a) => selecionadas.has(a.id)));
  }

  return (
    <div
      className={`modal fade show d-block ${modalStyles.backdrop}`}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      aria-describedby={descricaoId}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className={`modal-content ${cardStyles.card} border-0 p-4`}>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className={`${cardStyles.iconCircle} ${cardStyles.iconCirclePrimary}`}
            >
              <LuDownload aria-hidden="true" />
            </div>
            <h2 className="h5 fw-bold mb-0" id={tituloId}>
              Exportar histórico em PDF
            </h2>
          </div>
          <p
            className={`text-secondary mb-3 ${modalStyles.modalText}`}
            id={descricaoId}
          >
            Marque quais análises deseja exportar (a lista segue da mais
            recente para a mais antiga).
          </p>

          <div className={styles.selecaoHeader}>
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
          </div>

          <div
            className={styles.lista}
            role="group"
            aria-label="Análises para exportar"
          >
            {analises.map((analise) => (
              <label
                key={analise.id}
                className={`d-flex align-items-start gap-2 ${styles.item}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selecionadas.has(analise.id)}
                  onChange={() => alternarUma(analise.id)}
                />
                <span className={`flex-fill ${styles.itemTexto}`}>
                  <span className={`fw-semibold d-block ${styles.itemTitulo}`}>
                    {analise.titulo_vaga}
                  </span>
                  <span
                    className={`text-secondary d-block ${styles.itemSubtitulo}`}
                  >
                    {analise.empresa ? `${analise.empresa} · ` : ""}
                    {formatarData(analise.created_at)}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <p className={`mb-0 ${styles.contador}`} role="status">
            {selecionadas.size} de {analises.length}{" "}
            {analises.length === 1 ? "análise selecionada" : "análises selecionadas"}
          </p>

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button
              type="button"
              onClick={aoCancelar}
              disabled={processando}
              autoFocus
              className={`btn btn-light px-3 ${modalStyles.modalButtonLight}`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmar}
              disabled={processando || selecionadas.size === 0}
              className={`${buttonStyles.primary} ${buttonStyles.primaryCompact} px-4`}
            >
              {processando ? "Exportando..." : "Exportar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
