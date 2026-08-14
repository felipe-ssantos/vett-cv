import { useId, useState } from "react";
import { LuDownload } from "react-icons/lu";
import cardStyles from "../../../styles/ui/Card.module.css";
import modalStyles from "../../../styles/ui/Modal.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import styles from "./ExportarHistoricoModal.module.css";

interface ExportarHistoricoModalProps {
  totalAnalises: number;
  aoConfirmar: (quantidade: number) => void;
  aoCancelar: () => void;
  processando?: boolean;
}

type ModoExportacao = "todas" | "quantidade";

// Padrão ao escolher "quantidade": as 5 análises mais recentes.
const QUANTIDADE_PADRAO = 5;

function limitarQuantidade(valor: number, total: number): number {
  return Math.min(Math.max(1, valor), total);
}

/**
 * Diálogo de exportação do histórico: o usuário escolhe exportar todas as
 * análises ou apenas as N mais recentes (1..total). Componente presentacional —
 * recebe o total e o callback com a quantidade confirmada.
 */
export function ExportarHistoricoModal({
  totalAnalises,
  aoConfirmar,
  aoCancelar,
  processando = false,
}: ExportarHistoricoModalProps) {
  // A quantidade é mantida como texto enquanto o usuário digita (o clamp para
  // 1..total acontece no blur e na confirmação) — evitar que o valor controlado
  // "salte" durante a digitação.
  const [modo, setModo] = useState<ModoExportacao>("todas");
  const [quantidadeTexto, setQuantidadeTexto] = useState(() =>
    String(limitarQuantidade(QUANTIDADE_PADRAO, totalAnalises)),
  );
  const tituloId = useId();
  const descricaoId = useId();

  function normalizarQuantidade(valor: string): number {
    const numero = Number.parseInt(valor, 10);
    return limitarQuantidade(Number.isNaN(numero) ? 1 : numero, totalAnalises);
  }

  function handleConfirmar() {
    aoConfirmar(
      modo === "todas" ? totalAnalises : normalizarQuantidade(quantidadeTexto),
    );
  }

  function handleQuantidadeChange(valor: string) {
    setQuantidadeTexto(valor.replace(/\D/g, ""));
  }

  function handleQuantidadeBlur() {
    setQuantidadeTexto(String(normalizarQuantidade(quantidadeTexto)));
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
            Escolha quantas análises deseja exportar (da mais recente para a
            mais antiga).
          </p>

          <div className={`d-flex flex-column gap-3 mb-4 ${styles.opcoes}`}>
            <label className={`d-flex align-items-start gap-2 ${styles.opcao}`}>
              <input
                type="radio"
                name="modo-exportacao"
                className="mt-1"
                checked={modo === "todas"}
                onChange={() => setModo("todas")}
              />
              <span>
                <span className="fw-semibold d-block">Todas as análises</span>
                <span className="text-secondary">
                  {totalAnalises} {totalAnalises === 1 ? "análise" : "análises"}{" "}
                  no histórico
                </span>
              </span>
            </label>

            <label className={`d-flex align-items-start gap-2 ${styles.opcao}`}>
              <input
                type="radio"
                name="modo-exportacao"
                className="mt-1"
                checked={modo === "quantidade"}
                onChange={() => setModo("quantidade")}
              />
              <span className="flex-fill">
                <span className="fw-semibold d-block">
                  Escolher quantidade
                </span>
                {modo === "quantidade" && (
                  <span
                    className={`d-inline-flex align-items-center gap-2 mt-1 ${styles.quantidadeLinha}`}
                  >
                    <span className="text-secondary">Exportar as últimas</span>
                    <input
                      type="number"
                      min={1}
                      max={totalAnalises}
                      value={quantidadeTexto}
                      onChange={(e) => handleQuantidadeChange(e.target.value)}
                      onBlur={handleQuantidadeBlur}
                      className={`form-control form-control-sm ${styles.quantidadeInput}`}
                      aria-label="Quantidade de análises para exportar"
                    />
                    <span className="text-secondary">
                      {totalAnalises === 1 ? "análise" : "análises"}
                    </span>
                  </span>
                )}
              </span>
            </label>
          </div>

          <div className="d-flex justify-content-end gap-2">
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
              disabled={processando}
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
