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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Histórico de análises</h1>
        <Link to="/" className="bg-indigo-600 text-white rounded px-4 py-2">
          Nova análise
        </Link>
      </div>

      {carregando && <p>Carregando...</p>}
      {erro && <p className="text-red-600">{erro}</p>}
      {!carregando && !erro && analises.length === 0 && (
        <p>Nenhuma análise feita ainda.</p>
      )}

      <ul className="space-y-3">
        {analises.map((analise) => (
          <li key={analise.id} className="border rounded p-3">
            <Link
              to={`/analises/${analise.id}`}
              className="flex items-center justify-between"
            >
              <div>
                <strong>{analise.titulo_vaga}</strong>
                {analise.empresa && <span> — {analise.empresa}</span>}
                <p className="text-sm text-gray-500">
                  {new Date(analise.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <span className="font-bold text-indigo-600">
                {analise.score_match}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
