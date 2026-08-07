import {
  LuCheck,
  LuClipboardList,
  LuGlobe,
  LuLightbulb,
  LuStar,
  LuThumbsUp,
  LuTriangleAlert,
  LuUser,
  LuWrench,
} from "react-icons/lu";
import cardStyles from "../../../styles/ui/Card.module.css";
import motionStyles from "../../../styles/ui/Motion.module.css";
import reportStyles from "../../../styles/ui/Report.module.css";
import type { AnaliseMatchIA } from "../../../types";

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

interface RelatorioAnaliseProps {
  analise: AnaliseMatchIA;
}

/**
 * Apresentação pura do resultado da análise: score, escala, barras por
 * categoria, pontos fortes/lacunas, recomendações e insight. Sem estado ou
 * efeitos — recebe a análise pronta.
 */
export function RelatorioAnalise({ analise }: RelatorioAnaliseProps) {
  return (
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
            <p className={reportStyles.scoreDescription}>{analise.resumoIA}</p>
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
            <h3 className={`h6 fw-bold mb-3 ${reportStyles.sectionTitle}`}>
              Onde você se encaixa
            </h3>
            {Object.entries(analise.matchPorCategoria).map(([chave, valor]) => (
              <DimensaoBarra
                key={chave}
                iconKey={chave}
                label={LABELS_CATEGORIA[chave] ?? chave}
                valor={valor}
              />
            ))}
          </div>
        </div>

        {/* Right column: Favor & Lacuna */}
        <div className="col-md-6 d-flex flex-column gap-3">
          {/* Favor */}
          <div className={`${cardStyles.card} flex-fill`}>
            <div className="d-flex align-items-center gap-2 mb-2">
              <div
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCircleSuccess}`}
              >
                <LuThumbsUp />
              </div>
              <h3
                className={`h6 fw-bold mb-0 text-dark ${reportStyles.sectionTitleCompact}`}
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
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCircleWarning}`}
              >
                <LuTriangleAlert />
              </div>
              <h3
                className={`h6 fw-bold mb-0 text-dark ${reportStyles.sectionTitleCompact}`}
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
              <div className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm}`}>
                <LuClipboardList />
              </div>
              <h3 className={`h6 fw-bold mb-0 ${reportStyles.sectionTitle}`}>
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
                className={`${cardStyles.iconCircle} ${cardStyles.iconCircleSm} ${cardStyles.iconCirclePrimary}`}
              >
                <LuLightbulb />
              </div>
              <h3 className={`h6 fw-bold mb-0 ${reportStyles.sectionTitle}`}>
                Insight
              </h3>
            </div>
            <p className={`mb-0 text-secondary ${reportStyles.insightText}`}>
              {analise.dicaFinal}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
