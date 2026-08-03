import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

export function AnaliseList() {
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAnalises() {
      const { data, error } = await supabase
        .from("analises")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErro("Não foi possível carregar o histórico.");
        console.error(error);
      } else {
        setAnalises(data ?? []);
      }
      setCarregando(false);
    }
    carregarAnalises();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Histórico de análises</h1>
        <Link to="/" className="btn btn-primary">
          Nova análise
        </Link>
      </div>

      {carregando && <p>Carregando...</p>}
      {erro && <div className="alert alert-danger">{erro}</div>}
      {!carregando && !erro && analises.length === 0 && (
        <p className="text-secondary">Nenhuma análise feita ainda.</p>
      )}

      <div className="list-group">
        {analises.map((analise) => (
          <Link
            key={analise.id}
            to={`/analises/${analise.id}`}
            className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
          >
            <div>
              <strong>{analise.titulo_vaga}</strong>
              {analise.empresa && <span> — {analise.empresa}</span>}
              <div className="text-secondary small">
                {new Date(analise.created_at).toLocaleDateString("pt-BR")}
              </div>
            </div>
            <span className="badge bg-primary rounded-pill fs-6">
              {analise.score_match}%
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
