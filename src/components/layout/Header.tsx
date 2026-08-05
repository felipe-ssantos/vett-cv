import { Link } from "react-router-dom";
import { LuClock } from "react-icons/lu";

export function Header() {
  return (
    <header className="d-flex justify-content-between align-items-center py-4 vett-header">
      <div className="d-flex align-items-center gap-3">
        <Link
          to="/"
          className="text-decoration-none d-flex align-items-center gap-2"
        >
          <svg
            width="34"
            height="26"
            viewBox="0 0 44 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="15" cy="16" r="14" fill="#0B4F46" />
            <circle cx="29" cy="16" r="14" fill="#10B981" fillOpacity="0.85" />
          </svg>
          <span className="vett-wordmark">Vett</span>
        </Link>
        <span className="vett-tagline">Saiba antes de aplicar.</span>
      </div>

      <Link to="/historico" className="vett-history-link">
        <LuClock size={17} />
        Histórico
      </Link>
    </header>
  );
}
