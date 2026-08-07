import styles from "./Footer.module.css";

export function Footer() {
  const ANO_CRIACAO = 2026;
  const anoAtual = new Date().getFullYear();
  const textoAno =
    anoAtual > ANO_CRIACAO ? `${ANO_CRIACAO}–${anoAtual}` : `${ANO_CRIACAO}`;

  return (
    <footer className={`${styles.footer} d-flex flex-wrap justify-content-between align-items-center gap-2`}>
      <span className={styles.text}>
        © {textoAno} Vett · v1.0 · beta
      </span>

      <div className={`${styles.text} d-flex align-items-center gap-3`}>
        <span>
          Desenvolvido por{" "}
          <a
            href="https://nfelipe-dev.vercel.app/sobre"
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.link} text-decoration-none fw-medium`}
          >
            Nelson Felipe
          </a>
        </span>

        <a
          href="https://github.com/felipe-ssantos"
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.linkMuted} text-decoration-none`}
          aria-label="GitHub de Nelson Felipe"
        >
          <i className={`${styles.icon} bi bi-github`} />
        </a>
      </div>
    </footer>
  );
}
