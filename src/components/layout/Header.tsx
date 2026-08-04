import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="position-relative overflow-hidden mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-4 position-relative py-3">
        {/* Branding */}
        <div className="d-flex align-items-center gap-3">
          <div className="brand-icon">
            <i className="bi bi-cpu" />
          </div>
          <div>
            <Link to="/" className="text-decoration-none d-block">
              <span
                className="d-block fw-bold"
                style={{ fontSize: "26px", color: "var(--text-title)" }}
              >
                Job Fit Analyzer
              </span>
            </Link>
            <span style={{ fontSize: "16px", color: "var(--text-aux)" }}>
              Matcher de Currículo x Vaga
            </span>
          </div>
        </div>

        {/* Headline central */}
        <div style={{ maxWidth: 560 }}>
          <h1
            className="mb-2"
            style={{
              fontSize: "30px",
              fontWeight: 700,
              lineHeight: 1.2,
              color: "var(--text-title)",
            }}
          >
            Descubra o quanto seu currículo{" "}
            <span className="headline-highlight">combina com a vaga</span>{" "}
            <i className="bi bi-stars" style={{ fontSize: "22px" }} />
          </h1>
          <p className="mb-0" style={{ fontSize: "17px", color: "#58657D" }}>
            Análise inteligente com IA para você se destacar nos processos
            seletivos.
          </p>
        </div>
      </div>

      {/* Ilustração decorativa */}
      <svg
        className="position-absolute top-0 end-0 d-none d-lg-block"
        width="260"
        height="160"
        viewBox="0 0 260 160"
        style={{ opacity: 0.35, pointerEvents: "none" }}
      >
        <rect
          x="30"
          y="10"
          width="110"
          height="140"
          rx="8"
          fill="none"
          stroke="#BEB9FF"
          strokeWidth="4"
        />
        <line
          x1="50"
          y1="40"
          x2="120"
          y2="40"
          stroke="#7A6CF0"
          strokeWidth="4"
        />
        <line
          x1="50"
          y1="58"
          x2="120"
          y2="58"
          stroke="#D9D7FF"
          strokeWidth="4"
        />
        <line
          x1="50"
          y1="76"
          x2="100"
          y2="76"
          stroke="#D9D7FF"
          strokeWidth="4"
        />
        <line
          x1="50"
          y1="94"
          x2="120"
          y2="94"
          stroke="#D9D7FF"
          strokeWidth="4"
        />
        <circle
          cx="175"
          cy="105"
          r="32"
          fill="none"
          stroke="#4338CA"
          strokeWidth="6"
        />
        <line
          x1="198"
          y1="128"
          x2="228"
          y2="158"
          stroke="#4338CA"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    </header>
  );
}
