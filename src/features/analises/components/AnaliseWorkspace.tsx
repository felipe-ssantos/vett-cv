import { useEffect, useRef } from "react";
import {
  LuArrowRight,
  LuBriefcase,
  LuCheck,
  LuClipboard,
  LuFileText,
  LuLock,
  LuSparkles,
  LuUser,
  LuX,
} from "react-icons/lu";
import { Link } from "react-router";
import { formatarTamanhoArquivo } from "../../../lib/formatarArquivo";
import cardStyles from "../../../styles/ui/Card.module.css";
import formStyles from "../../../styles/ui/Form.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import emptyStyles from "../../../styles/ui/EmptyState.module.css";
import statusStyles from "../../../styles/ui/Status.module.css";
import reportStyles from "../../../styles/ui/Report.module.css";
import workspaceStyles from "./AnaliseWorkspace.module.css";
import {
  ETAPAS_ANALISE,
  LIMITE_CARACTERES,
  ROTULO_TAMANHO_MAXIMO,
  useAnaliseCurriculo,
} from "../hooks/useAnaliseCurriculo";
import { useCotaAnalises } from "../hooks/useCotaAnalises";
import { CotaAnalises } from "./CotaAnalises";
import { RelatorioAnalise } from "./RelatorioAnalise";
import type { AnaliseMatchIA } from "../../../types";

interface PainelAnalisandoProps {
  etapaAtual: number;
}

/** Estado "analisando": spinner, etapa atual e barra de progresso. */
function PainelAnalisando({ etapaAtual }: PainelAnalisandoProps) {
  return (
    <div className={emptyStyles.emptyState} aria-live="polite">
      <div
        className={`${emptyStyles.emptyIcon} spinner-border text-teal`}
        role="status"
      >
        <span className="visually-hidden">Carregando...</span>
      </div>
      <h3 className="h6 fw-bold mb-2">{ETAPAS_ANALISE[etapaAtual]}</h3>
      <div className={`${reportStyles.scaleTrack} ${reportStyles.loadingTrack} mt-3`}>
        <div className={`${reportStyles.scaleFill} ${reportStyles.loadingFill}`} />
      </div>
    </div>
  );
}

/** Estado vazio: nenhuma análise ainda. */
function PainelVazio() {
  return (
    <div className={emptyStyles.emptyState}>
      <div className={emptyStyles.emptyIcon}>
        <LuSparkles />
      </div>
      <h3 className="h6 fw-bold mb-1">Sua análise aparecerá aqui</h3>
      <p className={`mb-0 text-secondary ${emptyStyles.emptyTextNarrow}`}>
        Preencha seu perfil e a oportunidade ao lado. O Vett analisará o
        alinhamento entre os dois.
      </p>
    </div>
  );
}

/**
 * Estado bloqueado (cota diária esgotada): a análise anterior (se houver)
 * fica EMBACADA ao fundo, como uma imagem desfocada, com um overlay de
 * bloqueio por cima. Quando não há análise anterior, embaça o estado vazio.
 */
function PainelBloqueado({ analise }: { analise: AnaliseMatchIA | null }) {
  return (
    <div className={workspaceStyles.blurWrapper}>
      <div
        className={workspaceStyles.blurredContent}
        aria-hidden="true"
        inert
        data-testid="analise-embacada"
      >
        {analise ? (
          <RelatorioAnalise analise={analise} />
        ) : (
          <PainelVazio />
        )}
      </div>
      <div className={workspaceStyles.blurOverlay}>
        <div className={workspaceStyles.blurCard}>
          <div className={workspaceStyles.blurIcon}>
            <LuLock aria-hidden="true" />
          </div>
          <h3 className="h6 fw-bold mb-1">Cota diária esgotada</h3>
          <p className={`mb-2 text-secondary ${workspaceStyles.blurText}`}>
            Você usou todas as análises de hoje. O resultado anterior fica
            bloqueado até a cota renovar à meia-noite (UTC).
          </p>
          <Link
            to="/historico"
            className="btn btn-light border text-secondary btn-sm d-inline-flex align-items-center gap-1"
          >
            Ver meu histórico
          </Link>
        </div>
      </div>
    </div>
  );
}

interface PainelResultadoAnaliseProps {
  analisando: boolean;
  etapaAtual: number;
  analise: AnaliseMatchIA | null;
  bloqueado: boolean;
}

/** Alterna entre os estados do painel de resultado usando guard clauses. */
function PainelResultadoAnalise({
  analisando,
  etapaAtual,
  analise,
  bloqueado,
}: PainelResultadoAnaliseProps) {
  if (analisando) return <PainelAnalisando etapaAtual={etapaAtual} />;
  if (bloqueado) return <PainelBloqueado analise={analise} />;
  if (!analise) return <PainelVazio />;
  return <RelatorioAnalise analise={analise} />;
}

export function AnaliseWorkspace() {
  const {
    descricaoVaga,
    curriculoTexto,
    arquivo,
    arquivoInputRef,
    analisando,
    erro,
    erroArquivo,
    avisoSalvamento,
    analise,
    tempoAnalise,
    etapaAtual,
    handleCurriculoChange,
    handleDescricaoChange,
    handleArquivoChange,
    handleRemoverArquivo,
    handleColarCurriculo,
    handleColarDescricao,
    handleSubmit,
  } = useAnaliseCurriculo();

  // Cota diária de análises (restantes + horário de renovação).
  const { cota, carregando: carregandoCota, atualizarCota } =
    useCotaAnalises();

  // Recarrega a cota sempre que uma análise termina (sucesso ou erro): o
  // servidor incrementa o contador em cada tentativa.
  const analisandoAnterior = useRef(analisando);
  useEffect(() => {
    if (analisandoAnterior.current && !analisando) atualizarCota();
    analisandoAnterior.current = analisando;
  }, [analisando, atualizarCota]);

  // Bloqueio por cota: sessão OU global esgotadas, ou erro de limite vindo da
  // API (429). Quando bloqueado, o painel de resultado mostra a análise
  // anterior embaçada com um overlay de bloqueio no lugar dos dados normais.
  const sessaoEsgotada =
    cota !== null && cota.sessao !== null && cota.sessao.restante === 0;
  const globalEsgotada =
    cota !== null && cota.global !== null && cota.global.restante === 0;
  // Cobre as mensagens de limite da API e do cliente: "Limite de análises
  // diárias atingido", "Você atingiu o limite de 5 análises...", "O limite
  // diário de análises do Vett foi atingido" e a cota global.
  const erroDeCota =
    erro !== null &&
    /limite.{0,20}an[áa]lises|atingiu o limite|foi atingido|cota global/i.test(
      erro,
    );
  const bloqueado = sessaoEsgotada || globalEsgotada || erroDeCota;

  // Estado derivado: condições simples calculadas a partir de outros estados.
  const temConteudoCurriculo =
    curriculoTexto.trim().length > 0 || arquivo !== null;
  const temDescricaoVaga = descricaoVaga.trim().length > 0;

  return (
    <div className="row g-3">
      <h1 className="visually-hidden">
        Análise de compatibilidade entre currículo e vaga
      </h1>
      {/* Coluna esquerda — Seu perfil / Oportunidade */}
      <div className="col-lg-5">
        <form onSubmit={handleSubmit}>
          {/* Card 1: Seu perfil */}
          <div className={`${cardStyles.card} mb-3`}>
            <div className={`${cardStyles.cardHeader} mb-2`}>
              <div className={cardStyles.iconCircle}>
                <LuUser />
              </div>
              <div>
                <h2 className="h6 mb-0 fw-bold">Seu perfil</h2>
                <div className={workspaceStyles.helperText}>
                  Conte ao Vett sobre sua experiência profissional.
                </div>
              </div>
            </div>

            <div className={formStyles.labelRow}>
              <label className={formStyles.fieldLabel} htmlFor="curriculo-texto">
                Currículo
              </label>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={handleColarCurriculo}
                  disabled={!!arquivo}
                  className={`btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1 py-0 px-2 ${formStyles.pasteButton}`}
                  title="Colar texto do currículo"
                >
                  <LuClipboard size={12} /> Colar
                </button>
                <span className={formStyles.charCount} id="curriculo-contador">
                  {curriculoTexto.length}/{LIMITE_CARACTERES}
                </span>
              </div>
            </div>

            <div className={`${formStyles.inputWrapper} mb-2`}>
              <textarea
                id="curriculo-texto"
                className={`form-control ${formStyles.textarea} ${formStyles.textareaTall} w-100`}
                placeholder="Analista de Dados com experiência em SQL, Python, Power BI..."
                maxLength={LIMITE_CARACTERES}
                value={curriculoTexto}
                onChange={handleCurriculoChange}
                disabled={!!arquivo}
                aria-describedby="curriculo-contador"
              />
              {temConteudoCurriculo && (
                <div className={formStyles.checkBadge} aria-hidden="true">
                  <LuCheck />
                </div>
              )}
            </div>

            <div>
              <label className={formStyles.fieldLabel} htmlFor="curriculo-arquivo">
                Ou envie o arquivo do currículo
              </label>
              <input
                id="curriculo-arquivo"
                ref={arquivoInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleArquivoChange}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && arquivo) {
                    e.preventDefault();
                    handleRemoverArquivo();
                  }
                }}
                className={`form-control form-control-sm mt-1 ${formStyles.fileInput}`}
                aria-describedby="curriculo-arquivo-desc"
              />
              <div
                id="curriculo-arquivo-desc"
                className={`form-text ${formStyles.fieldHint}`}
              >
                Formatos aceitos: <strong>PDF ou DOCX</strong> (máx.{" "}
                {ROTULO_TAMANHO_MAXIMO}) — o texto do currículo será extraído
                automaticamente.
              </div>
              {erroArquivo && (
                <div
                  className={`form-text text-danger ${formStyles.fieldHint}`}
                  role="alert"
                >
                  {erroArquivo}
                </div>
              )}
              {arquivo && (
                <div
                  className="d-flex align-items-center justify-content-between gap-2 mt-1"
                  role="status"
                >
                  <div
                    className={`form-text mb-0 text-truncate ${formStyles.fileInfo}`}
                  >
                    <LuFileText
                      size={12}
                      className="me-1"
                      aria-hidden="true"
                    />
                    Selecionado: {arquivo.name} (
                    {formatarTamanhoArquivo(arquivo.size)})
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoverArquivo}
                    className={`btn btn-sm btn-outline-secondary border-0 p-0 text-danger d-inline-flex align-items-center gap-1 ${formStyles.fileRemove}`}
                    title="Remover arquivo selecionado"
                    aria-label="Remover arquivo selecionado"
                  >
                    <LuX size={13} aria-hidden="true" /> Remover
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Oportunidade */}
          <div className={`${cardStyles.card} mb-3`}>
            <div className={`${cardStyles.cardHeader} mb-2`}>
              <div className={cardStyles.iconCircle}>
                <LuBriefcase />
              </div>
              <div>
                <h2 className="h6 mb-0 fw-bold">Oportunidade</h2>
                <div className={workspaceStyles.helperText}>
                  Cole a descrição da vaga que você está considerando.
                </div>
              </div>
            </div>

            <div className={formStyles.labelRow}>
              <label className={formStyles.fieldLabel} htmlFor="descricao-vaga">
                Descrição da vaga
              </label>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={handleColarDescricao}
                  className={`btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1 py-0 px-2 ${formStyles.pasteButton}`}
                  title="Colar descrição da vaga"
                >
                  <LuClipboard size={12} /> Colar
                </button>
                <span className={formStyles.charCount} id="descricao-contador">
                  {descricaoVaga.length}/{LIMITE_CARACTERES}
                </span>
              </div>
            </div>

            <div className={formStyles.inputWrapper}>
              <textarea
                id="descricao-vaga"
                className={`form-control ${formStyles.textarea} ${formStyles.textareaTall} w-100`}
                placeholder="Buscamos Analista de Dados com experiência em SQL, Python, Looker..."
                maxLength={LIMITE_CARACTERES}
                value={descricaoVaga}
                onChange={handleDescricaoChange}
                aria-describedby="descricao-contador"
              />
              {temDescricaoVaga && (
                <div className={formStyles.checkBadge} aria-hidden="true">
                  <LuCheck />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={analisando}
            className={buttonStyles.primary}
          >
            {analisando ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  aria-hidden="true"
                />
                Analisando...
              </>
            ) : (
              <>
                Analisar oportunidade <LuArrowRight size={17} />
              </>
            )}
          </button>

          <div className={`text-center mt-2 ${workspaceStyles.privacyNote}`}>
            <LuLock size={12} className="me-1" />
            Suas análises são privadas e vinculadas à sua sessão.
          </div>

          {erro && <div className="alert alert-danger mt-2 mb-0">{erro}</div>}
        </form>
      </div>

      {/* Coluna direita — Sua análise */}
      <div className="col-lg-7">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h2 className="h6 mb-0 fw-bold">Sua análise</h2>
            <p className={`mb-0 ${workspaceStyles.helperText}`}>
              Veja o quanto seu perfil se alinha com esta oportunidade.
            </p>
          </div>
          {!analisando && tempoAnalise !== null && (
            <span className={statusStyles.statusPill}>
              <LuCheck size={14} />
              Análise concluída em {tempoAnalise.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Cota do dia: status/contexto junto do painel de resultado. */}
        <div className="mb-2">
          <CotaAnalises cota={cota} carregando={carregandoCota} />
        </div>

        {avisoSalvamento && (
          <div
            className={`alert alert-warning py-2 mb-3 ${workspaceStyles.saveWarning}`}
            role="status"
          >
            {avisoSalvamento}
          </div>
        )}

        <PainelResultadoAnalise
          analisando={analisando}
          etapaAtual={etapaAtual}
          analise={analise}
          bloqueado={bloqueado}
        />
      </div>
    </div>
  );
}
