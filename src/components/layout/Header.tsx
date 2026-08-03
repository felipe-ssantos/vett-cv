import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="bg-white border-bottom position-relative overflow-hidden">
      <div className="container py-4 d-flex flex-wrap justify-content-between align-items-center gap-3 position-relative">
        <div>
          <Link to="/" className="text-decoration-none d-block">
            <span
              className="h4 fw-bold mb-0 d-block"
              style={{ color: "var(--brand-purple)" }}
            >
              Job Fit Analyzer
            </span>
          </Link>
          <p className="text-secondary small mb-0">Match de Currículo x Vaga</p>
        </div>

        <div className="text-md-end" style={{ maxWidth: 420 }}>
          <p className="mb-0 fw-semibold">
            <span className="text-dark">Descubra o quanto seu currículo</span>{" "}
            <span style={{ color: "var(--brand-purple)" }}>
              combina com a vaga
            </span>
          </p>
          <p className="text-secondary small mb-0">
            Análise inteligente com IA para você se destacar nos processos
            seletivos.
          </p>
        </div>

        <svg
          className="position-absolute top-0 end-0 d-none d-md-block"
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{ opacity: 0.06, pointerEvents: "none" }}
        >
          <rect
            x="20"
            y="10"
            width="70"
            height="90"
            rx="6"
            fill="none"
            stroke="var(--brand-purple)"
            strokeWidth="4"
          />
          <line
            x1="35"
            y1="35"
            x2="75"
            y2="35"
            stroke="var(--brand-purple)"
            strokeWidth="4"
          />
          <line
            x1="35"
            y1="50"
            x2="75"
            y2="50"
            stroke="var(--brand-purple)"
            strokeWidth="4"
          />
          <line
            x1="35"
            y1="65"
            x2="60"
            y2="65"
            stroke="var(--brand-purple)"
            strokeWidth="4"
          />
          <circle
            cx="95"
            cy="95"
            r="20"
            fill="none"
            stroke="var(--brand-purple)"
            strokeWidth="5"
          />
          <line
            x1="110"
            y1="110"
            x2="130"
            y2="130"
            stroke="var(--brand-purple)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </header>
  );
}
