import { useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabaseClient";
import type { AnaliseMatchIA, VagaExtraidaIA } from "../../../types";

const LIMITE_CARACTERES = 5000;

const LABELS_CATEGORIA: Record<string, string> = {
  skills_tecnicas: "Skills técnicas",
  ferramentas: "Ferramentas",
  experiencia: "Experiência",
  soft_skills: "Soft skills",
};

function tierDoScore(score: number) {
  if (score >= 75) {
    return {
      titulo: "Você tem um ótimo alinhamento com a vaga!",
      label: "Ótimo Match",
      cor: "var(--green-dark)",
    };
  }
  if (score >= 50) {
    return {
      titulo: "Você tem um bom alinhamento com a vaga!",
      label: "Bom Match",
      cor: "var(--green-dark)",
    };
  }
  return {
    titulo: "Seu perfil ainda precisa de ajustes para essa vaga.",
    label: "Match a melhorar",
    cor: "var(--red)",
  };
}

function StepIndicator({
  numero,
  titulo,
  subtitulo,
  contador,
}: {
  numero: number;
  titulo: string;
  subtitulo: string;
  contador: string;
}) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-2">
      <div className="d-flex align-items-center gap-2">
        <span className="step-circle">{numero}</span>
        <div>
          <div
            className="fw-bold"
            style={{ fontSize: 16, color: "var(--text-title)" }}
          >
            {titulo}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-aux)" }}>
            {subtitulo}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
        {contador}
      </span>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="score-ring"
      style={{ "--score": score } as React.CSSProperties}
    >
      <div className="score-ring-inner">
        <span className="score-ring-value">{score}%</span>
        <span className="score-ring-label">{tierDoScore(score).label}</span>
      </div>
    </div>
  );
}

function MetricBar({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="mb-3">
      <div
        className="d-flex justify-content-between mb-1"
        style={{ fontSize: 13 }}
      >
        <span style={{ color: "var(--text-aux)" }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>{valor}%</span>
      </div>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ width: `${valor}%` }} />
      </div>
    </div>
  );
}

function KeywordBadge({
  texto,
  variante,
}: {
  texto: string;
  variante: "presente" | "faltando";
}) {
  return (
    <span
      className={`keyword-badge keyword-badge--${variante === "presente" ? "presente" : "faltando"}`}
    >
      {texto}
    </span>
  );
}

export function AnaliseWorkspace() {
  const [descricaoVaga, setDescricaoVaga] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [vaga, setVaga] = useState<VagaExtraidaIA | null>(null);
  const [analise, setAnalise] = useState<AnaliseMatchIA | null>(null);
  const [tempoAnalise, setTempoAnalise] = useState<number | null>(null);

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!descricaoVaga.trim()) {
      setErro("Cole a descrição da vaga.");
      return;
    }
    if (!curriculoTexto.trim() && !arquivo) {
      setErro("Cole o texto do currículo ou envie um arquivo PDF/DOCX.");
      return;
    }

    setAnalisando(true);
    setErro(null);
    const inicio = performance.now();

    try {
      const formData = new FormData();
      formData.append("descricaoVaga", descricaoVaga);
      if (arquivo) {
        formData.append("arquivo", arquivo);
      } else {
        formData.append("curriculoTexto", curriculoTexto);
      }

      const resposta = await fetch("/api/analisar", {
        method: "POST",
        body: formData,
      });
      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(corpo?.erro ?? "Falha na análise");
      }

      const {
        curriculoTexto: textoExtraido,
        descricaoVaga: descricaoOriginal,
        vaga: vagaExtraida,
        analise: analiseResultado,
      }: {
        curriculoTexto: string;
        descricaoVaga: string;
        vaga: VagaExtraidaIA;
        analise: AnaliseMatchIA;
      } = await resposta.json();

      setVaga(vagaExtraida);
      setAnalise(analiseResultado);
      setTempoAnalise((performance.now() - inicio) / 1000);

      // Salva no histórico sem bloquear a exibição do resultado
      supabase
        .from("analises")
        .insert({
          titulo_vaga: vagaExtraida.titulo,
          empresa: vagaExtraida.empresa,
          descricao_vaga: descricaoOriginal,
          hard_skills: vagaExtraida.hardSkills,
          soft_skills: vagaExtraida.softSkills,
          senioridade: vagaExtraida.senioridade,
          curriculo_texto: textoExtraido,
          score_match: analiseResultado.scoreMatch,
          match_por_categoria: analiseResultado.matchPorCategoria,
          keywords_presentes: analiseResultado.keywordsPresentes,
          keywords_faltando: analiseResultado.keywordsFaltando,
          pontos_fortes: analiseResultado.pontosFortes,
          sugestoes_ajuste: analiseResultado.sugestoesAjuste,
          resumo_ia: analiseResultado.resumoIA,
          dica_final: analiseResultado.dicaFinal,
        })
        .then(({ error }) => {
          if (error) console.error("Falha ao salvar no histórico:", error);
        });
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro inesperado na análise.",
      );
    } finally {
      setAnalisando(false);
    }
  }

  const tier = analise ? tierDoScore(analise.scoreMatch) : null;

  return (
    <div className="row g-4">
      {/* Coluna esquerda — formulário */}
      <div className="col-lg-4">
        <div className="card-clean p-4">
          <form onSubmit={handleSubmit}>
            <StepIndicator
              numero={1}
              titulo="Cole seu currículo"
              subtitulo="Cole o conteúdo do seu currículo abaixo"
              contador={`${curriculoTexto.length}/${LIMITE_CARACTERES}`}
            />
            <div className="position-relative mb-1">
              <textarea
                className="form-control textarea-clean"
                style={{ height: 240 }}
                placeholder="Cole aqui o texto do seu currículo..."
                maxLength={LIMITE_CARACTERES}
                value={curriculoTexto}
                onChange={(e) => {
                  setCurriculoTexto(e.target.value);
                  if (e.target.value) setArquivo(null);
                }}
                disabled={!!arquivo}
              />
              {curriculoTexto.trim().length > 0 && (
                <span
                  className="position-absolute d-inline-flex align-items-center justify-content-center"
                  style={{
                    right: 10,
                    bottom: 10,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "#22A447",
                    color: "#fff",
                    fontSize: 11,
                  }}
                >
                  <i className="bi bi-check-lg" />
                </span>
              )}
            </div>

            <div className="mb-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleArquivoChange}
                className="form-control form-control-sm"
              />
              {arquivo && (
                <div className="form-text">Selecionado: {arquivo.name}</div>
              )}
            </div>

            <hr
              className="my-4"
              style={{ borderColor: "var(--border-subtle)" }}
            />

            <StepIndicator
              numero={2}
              titulo="Cole a descrição da vaga"
              subtitulo="Cole a descrição completa da vaga abaixo"
              contador={`${descricaoVaga.length}/${LIMITE_CARACTERES}`}
            />
            <textarea
              className="form-control textarea-clean mb-3"
              style={{ height: 237 }}
              placeholder="Cole aqui a descrição completa da vaga (Indeed, LinkedIn, etc.)..."
              maxLength={LIMITE_CARACTERES}
              value={descricaoVaga}
              onChange={(e) => setDescricaoVaga(e.target.value)}
            />

            <button
              type="submit"
              disabled={analisando}
              className="btn btn-analisar mb-2"
            >
              {analisando ? (
                "Analisando..."
              ) : (
                <>
                  <i className="bi bi-search me-2" />
                  Analisar Job Fit
                </>
              )}
            </button>

            <p
              className="text-center mb-0"
              style={{ fontSize: 12, color: "var(--text-muted)" }}
            >
              Análise feita com IA · seu histórico fica salvo e criptografado neste navegador para reanálise
              posterior. Nenhum dado é enviado a terceiros.
            </p>

            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </form>
        </div>
      </div>

      {/* Coluna direita — resultado */}
      <div className="col-lg-8">
        <div className="card-clean p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <span
                className="d-inline-flex align-items-center justify-content-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--brand-purple-light)",
                  color: "var(--brand-purple)",
                }}
              >
                <i className="bi bi-file-earmark-text" />
              </span>
              <span
                className="fw-bold"
                style={{ fontSize: 17, color: "var(--text-title)" }}
              >
                Resultado da análise
              </span>
            </div>
            {tempoAnalise !== null && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <i
                  className="bi bi-check-circle-fill me-1"
                  style={{ color: "#16A34A" }}
                />
                Análise concluída em {tempoAnalise.toFixed(1)}s
              </span>
            )}
          </div>

          {!analise || !vaga || !tier ? (
            <div className="resultado-vazio d-flex flex-column align-items-center justify-content-center text-center">
              <i
                className="bi bi-search mb-3"
                style={{ fontSize: 40, color: "var(--brand-purple-border)" }}
              />
              <p className="mb-0" style={{ color: "var(--text-muted)" }}>
                Cole seu currículo e a descrição da vaga ao lado para ver o
                resultado da análise aqui.
              </p>
            </div>
          ) : (
            <>
              {/* Card do score */}
              <div className="card-inner p-4 mb-4 d-flex flex-column flex-md-row align-items-center gap-4">
                <ScoreRing score={analise.scoreMatch} />

                <div className="flex-grow-1">
                  <h2 className="h5 fw-bold mb-2" style={{ color: tier.cor }}>
                    {tier.titulo}
                  </h2>
                  <p
                    className="mb-1"
                    style={{ fontSize: 14, color: "var(--text-secondary)" }}
                  >
                    {analise.resumoIA}
                  </p>

                  <div className="d-flex align-items-center gap-3 mt-3">
                    <div className="flex-grow-1 score-bar-track">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${analise.scoreMatch}%` }}
                      >
                        <span className="score-bar-dot" />
                      </div>
                    </div>
                    <span
                      className="fw-bold"
                      style={{ fontSize: 20, color: tier.cor }}
                    >
                      {analise.scoreMatch}%
                    </span>
                  </div>
                  <div
                    className="d-flex justify-content-between mt-1"
                    style={{ fontSize: 12, color: "var(--text-muted)" }}
                  >
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div
                  className="d-none d-lg-block"
                  style={{ width: 1, height: 220, background: "#E5E7EB" }}
                />

                <div style={{ minWidth: 220 }}>
                  <h3
                    className="fw-bold mb-3"
                    style={{ fontSize: 15, color: "var(--text-title)" }}
                  >
                    Match por categoria
                  </h3>
                  {Object.entries(analise.matchPorCategoria).map(
                    ([chave, valor]) => (
                      <MetricBar
                        key={chave}
                        label={LABELS_CATEGORIA[chave] ?? chave}
                        valor={valor}
                      />
                    ),
                  )}
                </div>
              </div>

              {/* Três cards inferiores */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card-inner p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold" style={{ fontSize: 14 }}>
                        🟢 Palavras-chave presentes
                      </span>
                      <span className="badge-count badge-count--verde">
                        {analise.keywordsPresentes.length}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {analise.keywordsPresentes.map((k) => (
                        <KeywordBadge key={k} texto={k} variante="presente" />
                      ))}
                    </div>
                    <p
                      className="mb-0 mt-2"
                      style={{ fontSize: 12, color: "var(--text-muted)" }}
                    >
                      💡 Essas keywords aumentam suas chances!
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card-inner p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="fw-bold" style={{ fontSize: 14 }}>
                        🔴 Palavras-chave faltando
                      </span>
                      <span className="badge-count badge-count--vermelho">
                        {analise.keywordsFaltando.length}
                      </span>
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {analise.keywordsFaltando.map((k) => (
                        <KeywordBadge key={k} texto={k} variante="faltando" />
                      ))}
                    </div>
                    <p
                      className="mb-0 mt-2"
                      style={{ fontSize: 12, color: "var(--text-muted)" }}
                    >
                      💡 Inclua essas keywords no seu currículo!
                    </p>
                  </div>
                </div>

                <div className="col-md-4">
                  <div className="card-inner p-3 h-100">
                    <span
                      className="fw-bold d-block mb-2"
                      style={{ fontSize: 14 }}
                    >
                      💡 Sugestões de ajuste
                    </span>
                    <div className="d-flex flex-column gap-3">
                      {analise.sugestoesAjuste.map((s, i) => (
                        <div key={i} className="d-flex align-items-start gap-2">
                          <span className="suggestion-icon">
                            <i
                              className="bi bi-stars"
                              style={{ fontSize: 12 }}
                            />
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "var(--text-strong)",
                              lineHeight: 1.55,
                            }}
                          >
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dica extra da IA */}
              <div className="ai-tip-card d-flex align-items-center gap-3">
                <span className="ai-tip-icon">
                  <i className="bi bi-magic" />
                </span>
                <div>
                  <h3
                    className="fw-bold mb-1"
                    style={{ fontSize: 15, color: "var(--brand-purple-dark)" }}
                  >
                    Dica extra da IA
                  </h3>
                  <p
                    className="mb-0"
                    style={{
                      fontSize: 13,
                      color: "var(--text-strong)",
                      lineHeight: 1.5,
                    }}
                  >
                    {analise.dicaFinal}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
