import { Link, useLocation } from "react-router";
import { LuClock, LuSparkles } from "react-icons/lu";

export function Header() {
  const location = useLocation();

  const isInicio = location.pathname === "/";
  const isHistorico =
    location.pathname.startsWith("/historico") ||
    location.pathname.startsWith("/analises");

  return (
    <header className="d-flex justify-content-between align-items-center py-3 vett-header mb-2">
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
          >
            <circle cx="15" cy="16" r="14" fill="#0B4F46" />
            <circle cx="29" cy="16" r="14" fill="#10B981" fillOpacity="0.85" />
          </svg>
          <span className="vett-wordmark">Vett</span>
        </Link>
        <span className="vett-tagline d-none d-sm-inline">
          Saiba antes de aplicar.
        </span>
      </div>

      <nav className="vett-nav-container">
        <Link to="/" className={`vett-nav-link ${isInicio ? "active" : ""}`}>
          <LuSparkles size={15} />
          Início
        </Link>
        <Link
          to="/historico"
          className={`vett-nav-link ${isHistorico ? "active" : ""}`}
        >
          <LuClock size={15} />
          Histórico
        </Link>
      </nav>
    </header>
  );
}
