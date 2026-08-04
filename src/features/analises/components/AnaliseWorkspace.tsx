import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabaseClient";
import type { AnaliseMatchIA, VagaExtraidaIA } from "../../../types";

const LIMITE_CARACTERES = 5000;

const ETAPAS_ANALISE = [
  "Lendo seu currículo...",
  "Interpretando a oportunidade...",
  "Comparando skills e experiência...",
  "Gerando recomendações...",
];

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
            style={{ fontSize: 15, color: "var(--text-primary)" }}
          >
            {titulo}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            {subtitulo}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
        {contador}
      </span>
    </div>
  );
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

export function AnaliseWorkspace() {
  const [descricaoVaga, setDescricaoVaga] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [analise, setAnalise] = useState<AnaliseMatchIA | null>(null);
  const [tempoAnalise, setTempoAnalise] = useState<number | null>(null);

  const [etapaAtual, setEtapaAtual] = useState(0);

  useEffect(() => {
    if (!analisando) return;
    const intervalo = setInterval(() => {
      setEtapaAtual((atual) => (atual + 1) % ETAPAS_ANALISE.length);
    }, 1800);
    return () => clearInterval(intervalo);
  }, [analisando]);

  function handleArquivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setArquivo(file);
    if (file) setCurriculoTexto("");
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

      setAnalise(analiseResultado);
      setTempoAnalise((performance.now() - inicio) / 1000);

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

  return (
    <div className="row g-5">
      {/* Coluna esquerda — Seu perfil / Oportunidade */}
      <div className="col-lg-5">
        <form onSubmit={handleSubmit}>
          <h2 className="h6 mb-1">Seu perfil</h2>
          <p className="form-hint">
            Conte ao Vett sobre sua experiência profissional.
          </p>

          <StepIndicator
            numero={1}
            titulo="Currículo"
            subtitulo="Cole aqui o conteúdo do seu currículo"
            contador={`${curriculoTexto.length}/${LIMITE_CARACTERES}`}
          />
          <textarea
            className="form-control mb-1"
            style={{ height: 220 }}
            placeholder="Cole aqui o conteúdo do seu currículo..."
            maxLength={LIMITE_CARACTERES}
            value={curriculoTexto}
            onChange={(e) => {
              setCurriculoTexto(e.target.value);
              if (e.target.value) setArquivo(null);
            }}
            disabled={!!arquivo}
          />

          <div className="mb-4">
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

          <div className="section-divider" />

          <h2 className="h6 mb-1">Oportunidade</h2>
          <p className="form-hint">
            Cole a descrição da vaga que você está considerando.
          </p>

          <StepIndicator
            numero={2}
            titulo="Descrição da vaga"
            subtitulo="Cole aqui a descrição completa da oportunidade"
            contador={`${descricaoVaga.length}/${LIMITE_CARACTERES}`}
          />
          <textarea
            className="form-control mb-4"
            style={{ height: 220 }}
            placeholder="Cole aqui a descrição completa da oportunidade..."
            maxLength={LIMITE_CARACTERES}
            value={descricaoVaga}
            onChange={(e) => setDescricaoVaga(e.target.value)}
          />

          <button
            type="submit"
            disabled={analisando}
            className="btn btn-primary w-100 mb-2"
          >
            {analisando ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                Analisando...
              </>
            ) : (
              "Analisar oportunidade →"
            )}
          </button>

          <p
            className="text-center mb-0"
            style={{ fontSize: 12, color: "var(--text-tertiary)" }}
          >
            Análise feita com IA · seu histórico é privado neste navegador
          </p>

          {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
        </form>
      </div>

      {/* Coluna direita — Sua análise */}
      <div className="col-lg-7">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h2 className="h6 mb-0">Sua análise</h2>
          {tempoAnalise !== null && !analisando && (
            <span className="status-concluida">
              <span className="status-concluida-dot" />
              Análise concluída em {tempoAnalise.toFixed(1)}s
            </span>
          )}
        </div>

        {analisando ? (
          <div className="empty-state">
            <p className="empty-state-title">{ETAPAS_ANALISE[etapaAtual]}</p>
            <div className="score-bar-track" style={{ width: 220 }}>
              <div className="score-bar-fill" style={{ width: "60%" }} />
            </div>
          </div>
        ) : !analise ? (
          <div className="empty-state">
            <p className="empty-state-title">Sua análise aparecerá aqui.</p>
            <p className="empty-state-text">
              Preencha seu perfil e a oportunidade ao lado. O Vett analisará o
              alinhamento entre os dois.
            </p>
          </div>
        ) : (
          <div className="fade-in-up">
            <p className="small mb-3" style={{ color: "var(--text-tertiary)" }}>
              Veja o quanto seu perfil se alinha com esta oportunidade.
            </p>

            <div className="score-editorial">
              <span className="score-editorial-value">
                {analise.scoreMatch}
              </span>
              <span className="score-editorial-total">/100</span>
            </div>
            <p className="score-editorial-classification mb-1">
              {classificarScore(analise.scoreMatch)}
            </p>
            <p
              className="small mb-0"
              style={{ color: "var(--text-secondary)" }}
            >
              {analise.resumoIA}
            </p>
            <div className="score-bar-track">
              <div
                className="score-bar-fill"
                style={{ width: `${analise.scoreMatch}%` }}
              />
            </div>

            <div className="section-divider" />

            <h3 className="h6 mb-3">Onde você se encaixa</h3>
            {Object.entries(analise.matchPorCategoria).map(([chave, valor]) => (
              <DimensaoBarra
                key={chave}
                label={LABELS_CATEGORIA[chave] ?? chave}
                valor={valor}
              />
            ))}

            <div className="row g-4 mt-1">
              <div className="col-md-6">
                <h3 className="h6 mb-3">O que joga a seu favor</h3>
                <ul className="evidence-list">
                  {analise.keywordsPresentes.map((k) => (
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
                <h3 className="h6 mb-3">Onde existe uma lacuna</h3>
                <ul className="evidence-list">
                  {analise.keywordsFaltando.map((k) => (
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
                <h3 className="h6 mb-3">Antes de aplicar</h3>
                <ol
                  className="ps-3 small mb-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {analise.sugestoesAjuste.map((s, i) => (
                    <li key={i} className="mb-2">
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="col-md-5">
                <h3 className="h6 mb-3">Insight</h3>
                <p
                  className="small mb-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {analise.dicaFinal}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
