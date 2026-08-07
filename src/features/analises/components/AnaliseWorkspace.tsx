import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  LuUser,
  LuBriefcase,
  LuCheck,
  LuArrowRight,
  LuLock,
  LuStar,
  LuWrench,
  LuGlobe,
  LuClipboardList,
  LuLightbulb,
  LuSparkles,
  LuClipboard,
  LuThumbsUp,
  LuTriangleAlert,
  LuFileText,
  LuX,
} from "react-icons/lu";
import { supabase } from "../../../lib/supabaseClient";
import { formatarTamanhoArquivo } from "../../../lib/formatarArquivo";
import { enviarAnalise } from "../../../lib/analisarApi";
import { lerTextoDaAreaDeTransferencia } from "../../../lib/areaTransferencia";
import cardStyles from "../../../styles/ui/Card.module.css";
import formStyles from "../../../styles/ui/Form.module.css";
import buttonStyles from "../../../styles/ui/Button.module.css";
import emptyStyles from "../../../styles/ui/EmptyState.module.css";
import statusStyles from "../../../styles/ui/Status.module.css";
import motionStyles from "../../../styles/ui/Motion.module.css";
import reportStyles from "../../../styles/ui/Report.module.css";
import type { AnaliseMatchIA } from "../../../types";

const LIMITE_CARACTERES = 5000;
// Mantido abaixo do limite de ~4.5 MB de body das funções do Vercel, para a
// falha vir com mensagem clara em vez de 413 HTML.
const TAMANHO_MAXIMO_ARQUIVO = 4 * 1024 * 1024; // 4 MB
const ROTULO_TAMANHO_MAXIMO = "4 MB";

const ETAPAS_ANALISE = [
  "Lendo seu currículo...",
  "Interpretando a oportunidade...",
  "Comparando skills e experiência...",
  "Gerando recomendações...",
];

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

export function AnaliseWorkspace() {
  const [descricaoVaga, setDescricaoVaga] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [avisoSalvamento, setAvisoSalvamento] = useState<string | null>(null);

  const [analise, setAnalise] = useState<AnaliseMatchIA | null>(null);
  const [tempoAnalise, setTempoAnalise] = useState<number | null>(null);

  const [etapaAtual, setEtapaAtual] = useState(0);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!analisando) return;
    const intervalo = setInterval(() => {
      setEtapaAtual((atual) => (atual + 1) % ETAPAS_ANALISE.length);
    }, 1800);
    return () => clearInterval(intervalo);
  }, [analisando]);

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErroArquivo(
        `O arquivo excede o limite de ${ROTULO_TAMANHO_MAXIMO}. Envie um arquivo menor.`,
      );
      setArquivo(null);
      e.target.value = "";
      return;
    }
    setErroArquivo(null);
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  function handleRemoverArquivo() {
    setArquivo(null);
    setErroArquivo(null);
    if (arquivoInputRef.current) {
      arquivoInputRef.current.value = "";
      arquivoInputRef.current.focus();
    }
  }

  async function handleColarDescricao() {
    try {
      const texto = await lerTextoDaAreaDeTransferencia();
      if (texto) {
        setDescricaoVaga(texto.slice(0, LIMITE_CARACTERES));
      }
    } catch (err) {
      console.error("Falha ao colar:", err);
      alert(err instanceof Error ? err.message : "Não foi possível colar.");
    }
  }

  async function handleColarCurriculo() {
    try {
      const texto = await lerTextoDaAreaDeTransferencia();
      if (texto) {
        setCurriculoTexto(texto.slice(0, LIMITE_CARACTERES));
        setArquivo(null);
      }
    } catch (err) {
      console.error("Falha ao colar:", err);
      alert(err instanceof Error ? err.message : "Não foi possível colar.");
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!descricaoVaga.trim()) {
      setErro("Cole a descrição da oportunidade.");
      return;
    }
    if (!curriculoTexto.trim() && !arquivo) {
      setErro("Cole o texto do currículo ou envie um arquivo PDF/DOCX.");
      return;
    }

    setAnalisando(true);
    setErro(null);
    setAvisoSalvamento(null);
    setEtapaAtual(0);
    const inicio = performance.now();

    try {
      const formData = new FormData();
      formData.append("descricaoVaga", descricaoVaga);
      if (arquivo) {
        formData.append("arquivo", arquivo);
      } else {
        formData.append("curriculoTexto", curriculoTexto);
      }

      const dados = await enviarAnalise(formData);
      const vagaExtraida = dados.vaga;
      if (!vagaExtraida) {
        throw new Error(
          "A resposta da análise veio incompleta. Tente novamente.",
        );
      }

      setAnalise(dados.analise);
      setTempoAnalise((performance.now() - inicio) / 1000);

      supabase
        .from("analises")
        .insert({
          titulo_vaga: vagaExtraida.titulo,
          empresa: vagaExtraida.empresa,
          descricao_vaga: descricaoVaga,
          hard_skills: vagaExtraida.hardSkills,
          soft_skills: vagaExtraida.softSkills,
          senioridade: vagaExtraida.senioridade,
          curriculo_texto: dados.curriculoTexto,
          score_match: dados.analise.scoreMatch,
          match_por_categoria: dados.analise.matchPorCategoria,
          keywords_presentes: dados.analise.keywordsPresentes,
          keywords_faltando: dados.analise.keywordsFaltando,
          pontos_fortes: dados.analise.pontosFortes,
          sugestoes_ajuste: dados.analise.sugestoesAjuste,
          resumo_ia: dados.analise.resumoIA,
          dica_final: dados.analise.dicaFinal,
        })
        .then(({ error }) => {
          if (error) {
            console.error("Falha ao salvar no histórico:", error);
            setAvisoSalvamento(
              "A análise foi gerada, mas não foi possível salvá-la no histórico. Verifique bloqueios de privacidade/anti-rastreamento do navegador e tente novamente.",
            );
          }
        });
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado na análise.",
      );
    } finally {
      setAnalisando(false);
    }
  }

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
                <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
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
                  className="btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1 py-0 px-2"
                  style={{ fontSize: 11.5, borderRadius: 5 }}
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
                className={`form-control ${formStyles.textarea} w-100`}
                style={{ height: 135 }}
                placeholder="Analista de Dados com experiência em SQL, Python, Power BI..."
                maxLength={LIMITE_CARACTERES}
                value={curriculoTexto}
                onChange={(e) => {
                  setCurriculoTexto(e.target.value);
                  if (e.target.value) setArquivo(null);
                }}
                disabled={!!arquivo}
                aria-describedby="curriculo-contador"
              />
              {(curriculoTexto.trim().length > 0 || arquivo) && (
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
                className="form-control form-control-sm mt-1"
                style={{ fontSize: 12 }}
                aria-describedby="curriculo-arquivo-desc"
              />
              <div
                id="curriculo-arquivo-desc"
                className="form-text"
                style={{ fontSize: 11.5 }}
              >
                Formatos aceitos: <strong>PDF ou DOCX</strong> (máx.{" "}
                {ROTULO_TAMANHO_MAXIMO}) — o texto do currículo será extraído
                automaticamente.
              </div>
              {erroArquivo && (
                <div
                  className="form-text text-danger"
                  style={{ fontSize: 11.5 }}
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
                    className="form-text mb-0 text-truncate"
                    style={{ fontSize: 11.5, minWidth: 0 }}
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
                    className="btn btn-sm btn-outline-secondary border-0 p-0 text-danger d-inline-flex align-items-center gap-1"
                    style={{ fontSize: 11, flexShrink: 0 }}
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
                <div style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}>
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
                  className="btn btn-sm btn-light border text-secondary d-inline-flex align-items-center gap-1 py-0 px-2"
                  style={{ fontSize: 11.5, borderRadius: 5 }}
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
                className={`form-control ${formStyles.textarea} w-100`}
                style={{ height: 135 }}
                placeholder="Buscamos Analista de Dados com experiência em SQL, Python, Looker..."
                maxLength={LIMITE_CARACTERES}
                value={descricaoVaga}
                onChange={(e) => setDescricaoVaga(e.target.value)}
                aria-describedby="descricao-contador"
              />
              {descricaoVaga.trim().length > 0 && (
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

          <div
            className="text-center mt-2"
            style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}
          >
            <LuLock
              size={12}
              className="me-1"
              style={{ verticalAlign: "-1px" }}
            />
            Suas análises ficam salvas somente neste navegador.
          </div>

          {erro && <div className="alert alert-danger mt-2 mb-0">{erro}</div>}
        </form>
      </div>

      {/* Coluna direita — Sua análise */}
      <div className="col-lg-7">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h2 className="h6 mb-0 fw-bold">Sua análise</h2>
            <p
              className="mb-0"
              style={{ fontSize: 12.5, color: "var(--text-tertiary)" }}
            >
              Veja o quanto seu perfil se alinha com esta oportunidade.
            </p>
          </div>
          {tempoAnalise !== null && !analisando && (
            <span className={statusStyles.statusPill}>
              <LuCheck size={14} />
              Análise concluída em {tempoAnalise.toFixed(1)}s
            </span>
          )}
        </div>

        {avisoSalvamento && (
          <div
            className="alert alert-warning py-2 mb-3"
            role="status"
            style={{ fontSize: 12.5 }}
          >
            {avisoSalvamento}
          </div>
        )}

        {analisando ? (
          <div className={emptyStyles.emptyState} aria-live="polite">
            <div
              className={`${emptyStyles.emptyIcon} spinner-border text-teal`}
              role="status"
            >
              <span className="visually-hidden">Carregando...</span>
            </div>
            <h3 className="h6 fw-bold mb-2">{ETAPAS_ANALISE[etapaAtual]}</h3>
            <div className={`${reportStyles.scaleTrack} mt-3`} style={{ width: 220 }}>
              <div className={reportStyles.scaleFill} style={{ width: "65%" }} />
            </div>
          </div>
        ) : !analise ? (
          <div className={emptyStyles.emptyState}>
            <div className={emptyStyles.emptyIcon}>
              <LuSparkles />
            </div>
            <h3 className="h6 fw-bold mb-1">Sua análise aparecerá aqui</h3>
            <p
              className="mb-0 text-secondary"
              style={{ fontSize: 13, maxWidth: 340 }}
            >
              Preencha seu perfil e a oportunidade ao lado. O Vett analisará o
              alinhamento entre os dois.
            </p>
          </div>
        ) : (
          <div className={motionStyles.fadeInUp}>
            {/* Top Score Compatibility Card */}
            <div className={`${cardStyles.card} mb-3`}>
              <div className={reportStyles.scoreHeader}>
                <div className={reportStyles.scoreNumberGroup}>
                  <span className={reportStyles.scoreNumber}>
                    {analise.scoreMatch}
                  </span>
                  <span className={reportStyles.scoreMax}>/100</span>
                </div>
                <div className={reportStyles.scoreInfo}>
                  <h3 className={reportStyles.scoreTitle}>
                    {classificarScore(analise.scoreMatch)}
                  </h3>
                  <p className={reportStyles.scoreDescription}>
                    {analise.resumoIA}
                  </p>
                </div>
              </div>

              {/* Progress scale bar with labels 0 - 50 - 100 */}
              <div className={reportStyles.scaleContainer}>
                <div className={reportStyles.scaleTrack}>
                  <div
                    className={reportStyles.scaleFill}
                    style={{ width: `${analise.scoreMatch}%` }}
                  />
                </div>
                <div className={reportStyles.scaleLabels}>
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* Sub-cards row: Onde você se encaixa / Favor / Lacuna */}
            <div className="row g-3 mb-3">
              {/* Onde você se encaixa (Compacto) */}
              <div className="col-md-6">
                <div className={`${cardStyles.card} h-100`}>
                  <h3 className="h6 fw-bold mb-3" style={{ fontSize: 14 }}>
                    Onde você se encaixa
                  </h3>
                  {Object.entries(analise.matchPorCategoria).map(
                    ([chave, valor]) => (
                      <DimensaoBarra
                        key={chave}
                        iconKey={chave}
                        label={LABELS_CATEGORIA[chave] ?? chave}
                        valor={valor}
                      />
                    ),
                  )}
                </div>
              </div>

              {/* Right column: Favor & Lacuna */}
              <div className="col-md-6 d-flex flex-column gap-3">
                {/* Favor */}
                <div className={`${cardStyles.card} flex-fill`}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSuccess}`}
                      style={{ width: 26, height: 26, fontSize: 13 }}
                    >
                      <LuThumbsUp />
                    </div>
                    <h3
                      className="h6 fw-bold mb-0 text-dark"
                      style={{ fontSize: 14, lineHeight: 1 }}
                    >
                      O que joga a seu favor
                    </h3>
                  </div>
                  <ul className={reportStyles.evidenceList}>
                    {analise.keywordsPresentes.map((k) => (
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
                      className={`${cardStyles.iconCircle} ${cardStyles.iconCircleWarning}`}
                      style={{ width: 26, height: 26, fontSize: 13 }}
                    >
                      <LuTriangleAlert />
                    </div>
                    <h3
                      className="h6 fw-bold mb-0 text-dark"
                      style={{ fontSize: 14, lineHeight: 1 }}
                    >
                      Onde existe uma lacuna
                    </h3>
                  </div>
                  <ul className={reportStyles.evidenceList}>
                    {analise.keywordsFaltando.map((k) => (
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
            <div className="row g-3">
              {/* Antes de aplicar */}
              <div className="col-md-6">
                <div className={`${cardStyles.card} h-100`}>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <div
                      className={cardStyles.iconCircle}
                      style={{ width: 26, height: 26, fontSize: 13 }}
                    >
                      <LuClipboardList />
                    </div>
                    <h3 className="h6 fw-bold mb-0" style={{ fontSize: 14 }}>
                      Antes de aplicar
                    </h3>
                  </div>
                  <ol className={reportStyles.numberedList}>
                    {analise.sugestoesAjuste.map((sugestao, index) => (
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
                      className={`${cardStyles.iconCircle} ${cardStyles.iconCirclePrimary}`}
                      style={{ width: 26, height: 26, fontSize: 13 }}
                    >
                      <LuLightbulb />
                    </div>
                    <h3 className="h6 fw-bold mb-0" style={{ fontSize: 14 }}>
                      Insight
                    </h3>
                  </div>
                  <p
                    className="mb-0 text-secondary"
                    style={{ fontSize: 13, lineHeight: 1.45 }}
                  >
                    {analise.dicaFinal}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
