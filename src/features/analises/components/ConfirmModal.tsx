import { useId, type ReactNode } from "react";
import { LuTriangleAlert } from "react-icons/lu";
import cardStyles from "../../../styles/ui/Card.module.css";
import modalStyles from "../../../styles/ui/Modal.module.css";

interface ConfirmModalProps {
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  processando?: boolean;
  rotuloCancelar?: string;
  rotuloEmProcessamento?: string;
}

/**
 * Diálogo de confirmação para ações destrutivas, compartilhado por
 * AnaliseList e AnaliseDetalhe. Componente presentacional: recebe título,
 * descrição (aceita JSX), rótulos e callbacks — sem estado próprio.
 */
export function ConfirmModal({
  titulo,
  descricao,
  rotuloConfirmar,
  aoConfirmar,
  aoCancelar,
  processando = false,
  rotuloCancelar = "Cancelar",
  rotuloEmProcessamento = "Processando...",
}: ConfirmModalProps) {
  const tituloId = useId();
  const descricaoId = useId();

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
            <div className={`${cardStyles.iconCircle} ${cardStyles.iconCircleWarning}`}>
              <LuTriangleAlert aria-hidden="true" />
            </div>
            <h2 className="h5 fw-bold mb-0" id={tituloId}>
              {titulo}
            </h2>
          </div>
          <p className={`text-secondary mb-4 ${modalStyles.modalText}`} id={descricaoId}>
            {descricao}
          </p>
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={aoCancelar}
              disabled={processando}
              autoFocus
              className={`btn btn-light px-3 ${modalStyles.modalButtonLight}`}
            >
              {rotuloCancelar}
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={processando}
              className={`btn btn-danger px-4 ${modalStyles.modalButtonDanger}`}
            >
              {processando ? rotuloEmProcessamento : rotuloConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
