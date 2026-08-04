import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

const LABELS_CATEGORIA: Record<string, string> = {
  skills_tecnicas: "Skills técnicas",
  ferramentas: "Ferramentas",
  experiencia: "Experiência",
  soft_skills: "Soft skills",
};

function classificarScore(score: number): string {
  if (score < 40) return "Baixa compatibilidade";
  if (score < 60) return "Compatibilidade moderada";
  if (score < 80) return "Boa compatibilidade";
  return "Forte compatibilidade";
}

function DimensaoBarra({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="fw-medium">{valor}/100</span>
      </div>
      <div className="dimension-bar-track">
        <div className="dimension-bar-fill" style={{ width: `${valor}%` }} />
      </div>
    </div>
  );
}

export function AnaliseDetalhe() {
  const { id } = useParams();
  const location = useLocation();
  const tempoAnaliseSegundos = (
    location.state as { tempoAnaliseSegundos?: number } | null
  )?.tempoAnaliseSegundos;

  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

  if (carregando) return <p>Carregando análise...</p>;
  if (erro || !analise) return <div className="alert alert-danger">{erro}</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8 d-flex flex-column gap-4 fade-in-up">
        <div>
          <Link
            to="/historico"
            className="small"
            style={{ color: "var(--text-tertiary)" }}
          >
            ← Voltar ao histórico
          </Link>
        </div>

        <div className="card-clean p-4">
          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h1 className="h4 mb-0">{analise.titulo_vaga}</h1>
            {analise.senioridade && (
              <span className="small" style={{ color: "var(--text-tertiary)" }}>
                {analise.senioridade}
              </span>
            )}
          </div>
          {analise.empresa && (
            <p className="mb-3" style={{ color: "var(--text-secondary)" }}>
              {analise.empresa}
            </p>
          )}

          {(analise.hard_skills.length > 0 ||
            analise.soft_skills.length > 0) && (
            <p className="small mb-2" style={{ color: "var(--text-tertiary)" }}>
              {[...analise.hard_skills, ...analise.soft_skills].join(" · ")}
            </p>
          )}

          <details
            className="small mt-2"
            style={{ color: "var(--text-secondary)" }}
          >
            <summary style={{ cursor: "pointer", color: "var(--primary)" }}>
              Ver descrição completa
            </summary>
            <p className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
              {analise.descricao_vaga}
            </p>
          </details>
        </div>

        <div>
          <div className="d-flex justify-content-between align-items-center mb-1">
            <h2 className="h5 mb-0">Sua análise</h2>
            {tempoAnaliseSegundos != null && (
              <span className="status-concluida">
                <span className="status-concluida-dot" />
                Análise concluída em {tempoAnaliseSegundos.toFixed(1)}s
              </span>
            )}
          </div>
          <p className="small mb-3" style={{ color: "var(--text-tertiary)" }}>
            Veja o quanto seu perfil se alinha com esta oportunidade.
          </p>

          <div className="score-editorial">
            <span className="score-editorial-value">{analise.score_match}</span>
            <span className="score-editorial-total">/100</span>
          </div>
          <p className="score-editorial-classification mb-1">
            {classificarScore(analise.score_match)}
          </p>
          <p className="small mb-0" style={{ color: "var(--text-secondary)" }}>
            {analise.resumo_ia}
          </p>
          <div className="score-bar-track">
            <div
              className="score-bar-fill"
              style={{ width: `${analise.score_match}%` }}
            />
          </div>
        </div>

        {analise.match_por_categoria && (
          <div>
            <h2 className="h6 mb-3">Onde você se encaixa</h2>
            {Object.entries(analise.match_por_categoria).map(
              ([chave, valor]) => (
                <DimensaoBarra
                  key={chave}
                  label={LABELS_CATEGORIA[chave] ?? chave}
                  valor={valor as number}
                />
              ),
            )}
          </div>
        )}

        <div className="row g-4">
          <div className="col-md-6">
            <h2 className="h6 mb-3">O que joga a seu favor</h2>
            <ul className="evidence-list">
              {analise.keywords_presentes.map((k) => (
                <li key={k} className="evidence-item">
                  <span className="evidence-icon evidence-icon--favor">
                    <i className="bi bi-check" />
                  </span>
                  {k}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h2 className="h6 mb-3">Onde existe uma lacuna</h2>
            <ul className="evidence-list">
              {analise.keywords_faltando.map((k) => (
                <li key={k} className="evidence-item">
                  <span className="evidence-icon evidence-icon--lacuna">
                    <i className="bi bi-exclamation" />
                  </span>
                  {k}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="section-divider" />

        <div className="row g-4">
          <div className="col-md-7">
            <h2 className="h6 mb-3">Antes de aplicar</h2>
            <ol
              className="ps-3 small mb-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {analise.sugestoes_ajuste.map((s, i) => (
                <li key={i} className="mb-2">
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <div className="col-md-5">
            <h2 className="h6 mb-3">Insight</h2>
            <p
              className="small mb-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {analise.dica_final}
            </p>
          </div>
        </div>

        <div className="d-flex justify-content-end">
          <Link
            to={`/analises/${analise.id}/reanalisar`}
            className="btn btn-primary"
          >
            Reanalisar com outro currículo
          </Link>
        </div>
      </div>
    </div>
  );
}
