import { Link, useLocation } from "react-router";
import { LuClock, LuMoon, LuSparkles, LuSun } from "react-icons/lu";
import { useTema } from "../../hooks/useTema";
import styles from "./Header.module.css";

export function Header() {
  const location = useLocation();
  const { tema, alternarTema } = useTema();

  const isInicio = location.pathname === "/";
  const isHistorico =
    location.pathname.startsWith("/historico") ||
    location.pathname.startsWith("/analises");

  return (
    <header className={`d-flex justify-content-between align-items-center py-3 mb-2 ${styles.header}`}>
      <div className="d-flex align-items-center gap-3">
        <Link
          to="/"
          className="text-decoration-none d-flex align-items-center gap-2"
        >
          <svg
            width="32"
            height="24"
            viewBox="0 0 44 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="15" cy="16" r="14" fill="#0B4F46" />
            <circle cx="29" cy="16" r="14" fill="#10B981" fillOpacity="0.85" />
          </svg>
          <span className={styles.wordmark}>Vett</span>
        </Link>
        <span className={`${styles.tagline} d-none d-sm-inline`}>
          Saiba antes de aplicar.
        </span>
      </div>

      <div className={styles.navGroup}>
        <nav className={styles.navContainer} aria-label="Navegação principal">
          <Link
            to="/"
            className={`${styles.navLink} ${isInicio ? "active" : ""}`}
            aria-current={isInicio ? "page" : undefined}
          >
            <LuSparkles size={15} aria-hidden="true" />
            Início
          </Link>
          <Link
            to="/historico"
            className={`${styles.navLink} ${isHistorico ? "active" : ""}`}
            aria-current={isHistorico ? "page" : undefined}
          >
            <LuClock size={15} aria-hidden="true" />
            Histórico
          </Link>
        </nav>
        <button
          type="button"
          onClick={alternarTema}
          className={styles.temaButton}
          aria-label={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
          title={tema === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
        >
          {tema === "dark" ? (
            <LuSun size={16} aria-hidden="true" />
          ) : (
            <LuMoon size={16} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
