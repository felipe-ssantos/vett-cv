export function Footer() {
  const ANO_CRIACAO = 2026;
  const anoAtual = new Date().getFullYear();
  const textoAno =
    anoAtual > ANO_CRIACAO ? `${ANO_CRIACAO}–${anoAtual}` : `${ANO_CRIACAO}`;

  return (
    <footer
      className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 mt-4"
      style={{ borderTop: "1px solid var(--border-subtle)" }}
    >
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
        © {textoAno} Vett · v1.0 · beta
      </span>

      <div
        className="d-flex align-items-center gap-3"
        style={{ fontSize: 12, color: "var(--text-tertiary)" }}
      >
        <span>
          Desenvolvido por{" "}
          <a
            href="https://nfelipe-dev.vercel.app/sobre"
            target="_blank"
            rel="noopener noreferrer"
            className="text-decoration-none fw-medium"
            style={{ color: "var(--primary)" }}
          >
            Nelson Felipe
          </a>
        </span>

        <a
          href="https://github.com/felipe-ssantos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-decoration-none"
          style={{ color: "var(--text-muted)" }}
          aria-label="GitHub de Nelson Felipe"
        >
          <i className="bi bi-github" style={{ fontSize: 15 }} />
        </a>
      </div>
    </footer>
  );
}
