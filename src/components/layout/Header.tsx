import { Link } from "react-router-dom";

export function Header() {
  return (
    <header className="d-flex justify-content-between align-items-center py-4">
      <div className="d-flex align-items-baseline gap-3">
        <Link to="/" className="text-decoration-none">
          <span className="vett-wordmark">Vett</span>
        </Link>
        <span className="vett-tagline">Saiba antes de aplicar.</span>
      </div>

      <Link to="/historico" className="vett-history-link">
        <i className="bi bi-clock-history"></i>
        Histórico
      </Link>
    </header>
  );
}
