import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

const LABELS_CATEGORIA: Record<string, string> = {
  skills_tecnicas: "Skills técnicas",
  ferramentas: "Ferramentas",
  experiencia: "Experiência",
  soft_skills: "Soft skills",
};

function BarraCategoria({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between small mb-1">
        <span>{label}</span>
        <span className="fw-medium">{valor}%</span>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="progress-bar" style={{ width: `${valor}%` }} />
      </div>
    </div>
  );
}

export function AnaliseDetalhe() {
  const { id } = useParams();
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
      <div className="col-lg-8 d-flex flex-column gap-4">
        <div>
          <Link to="/historico" className="small">
            ← Voltar ao histórico
          </Link>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
              <h1 className="h3 mb-0">{analise.titulo_vaga}</h1>
              {analise.senioridade && (
                <span className="badge bg-secondary-subtle text-secondary-emphasis">
                  {analise.senioridade}
                </span>
              )}
            </div>
            {analise.empresa && (
              <p className="text-secondary mb-3">{analise.empresa}</p>
            )}

            {analise.hard_skills.length > 0 && (
              <div className="mb-2">
                <p className="small fw-medium mb-1">Hard skills</p>
                <div className="d-flex flex-wrap gap-1">
                  {analise.hard_skills.map((s) => (
                    <span key={s} className="badge bg-light text-dark border">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analise.soft_skills.length > 0 && (
              <div className="mb-3">
                <p className="small fw-medium mb-1">Soft skills</p>
                <div className="d-flex flex-wrap gap-1">
                  {analise.soft_skills.map((s) => (
                    <span key={s} className="badge bg-light text-dark border">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <details className="small text-secondary mt-2">
              <summary className="text-primary" style={{ cursor: "pointer" }}>
                Ver descrição completa
              </summary>
              <p className="mt-2" style={{ whiteSpace: "pre-wrap" }}>
                {analise.descricao_vaga}
              </p>
            </details>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center py-5">
            <div
              className="score-circle mx-auto mb-3"
              style={{ "--score": analise.score_match } as React.CSSProperties}
            >
              <div className="score-circle-inner">{analise.score_match}%</div>
            </div>
            <p className="text-secondary mb-0">{analise.resumo_ia}</p>
          </div>
        </div>

        {analise.match_por_categoria && (
          <div className="card">
            <div className="card-body">
              <h2 className="h5 mb-3">Match por categoria</h2>
              {Object.entries(analise.match_por_categoria).map(
                ([chave, valor]) => (
                  <BarraCategoria
                    key={chave}
                    label={LABELS_CATEGORIA[chave] ?? chave}
                    valor={valor as number}
                  />
                ),
              )}
            </div>
          </div>
        )}

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h5 mb-2">Palavras-chave presentes</h2>
                <div className="d-flex flex-wrap gap-1">
                  {analise.keywords_presentes.map((k) => (
                    <span
                      key={k}
                      className="badge bg-success-subtle text-success-emphasis"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h2 className="h5 mb-2">Palavras-chave faltando</h2>
                <div className="d-flex flex-wrap gap-1">
                  {analise.keywords_faltando.map((k) => (
                    <span
                      key={k}
                      className="badge bg-danger-subtle text-danger-emphasis"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h2 className="h5 mb-2">Sugestões de ajuste</h2>
            <ul className="mb-0 small">
              {analise.sugestoes_ajuste.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="alert alert-primary mb-0">
          <h2 className="h6 mb-1">Dica para aumentar sua %</h2>
          <p className="mb-0 small">{analise.dica_final}</p>
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
