import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Vaga } from "../../../types";

export function VagaList() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarVagas() {
      const { data, error } = await supabase
        .from("vagas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErro("Não foi possível carregar as vagas.");
        console.error(error);
      } else {
        setVagas(data ?? []);
      }
      setCarregando(false);
    }
    carregarVagas();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Vagas</h1>
        <Link
          to="/vagas/nova"
          className="bg-indigo-600 text-white rounded px-4 py-2"
        >
          Nova vaga
        </Link>
      </div>

      {carregando && <p>Carregando vagas...</p>}
      {erro && <p className="text-red-600">{erro}</p>}
      {!carregando && !erro && vagas.length === 0 && (
        <p>Nenhuma vaga cadastrada ainda.</p>
      )}

      <ul className="space-y-3">
        {vagas.map((vaga) => (
          <li key={vaga.id} className="border rounded p-3">
            <Link to={`/vagas/${vaga.id}`}>
              <strong>{vaga.titulo}</strong>
              {vaga.empresa && <span> — {vaga.empresa}</span>}
              {vaga.senioridade && (
                <span className="ml-2 text-xs bg-gray-100 rounded px-2 py-0.5">
                  {vaga.senioridade}
                </span>
              )}
              {vaga.hard_skills.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {vaga.hard_skills.join(", ")}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
