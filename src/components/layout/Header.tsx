import { Link } from "react-router-dom";

export function Header() {
  return (
    <nav className="navbar bg-white border-bottom">
      <div className="container d-flex justify-content-between align-items-center py-2">
        <Link to="/" className="navbar-brand fw-bold text-primary mb-0">
          Job Fit Analyzer
        </Link>
        <Link to="/historico" className="btn btn-primary">
          Histórico
        </Link>
      </div>
    </nav>
  );
}
