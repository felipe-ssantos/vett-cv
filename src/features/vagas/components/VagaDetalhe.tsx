import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise, Vaga } from "../../../types";

export function VagaDetalhe() {
  const { id } = useParams();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      const [
        { data: vagaData, error: erroVaga },
        { data: analisesData, error: erroAnalises },
      ] = await Promise.all([
        supabase.from("vagas").select("*").eq("id", id).single(),
        supabase
          .from("analises")
          .select("*")
          .eq("vaga_id", id)
          .order("created_at", { ascending: false }),
      ]);

      if (erroVaga || !vagaData) {
        setErro("Não foi possível carregar a vaga.");
      } else {
        setVaga(vagaData);
        setAnalises(analisesData ?? []);
        if (erroAnalises) console.error(erroAnalises);
      }
      setCarregando(false);
    }
    if (id) carregar();
  }, [id]);

  if (carregando) return <p className="p-4">Carregando vaga...</p>;
  if (erro || !vaga) return <p className="p-4 text-red-600">{erro}</p>;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/historico" className="text-sm text-indigo-600">
          ← Voltar ao histórico
        </Link>
      </div>

      <div className="border rounded p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{vaga.titulo}</h1>
          {vaga.senioridade && (
            <span className="text-xs bg-gray-100 rounded px-2 py-0.5 whitespace-nowrap">
              {vaga.senioridade}
            </span>
          )}
        </div>
        {vaga.empresa && <p className="text-gray-500 mb-3">{vaga.empresa}</p>}

        {vaga.hard_skills.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium mb-1">Hard skills</p>
            <div className="flex flex-wrap gap-1">
              {vaga.hard_skills.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-gray-100 rounded px-2 py-0.5"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {vaga.soft_skills.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Soft skills</p>
            <div className="flex flex-wrap gap-1">
              {vaga.soft_skills.map((s) => (
                <span
                  key={s}
                  className="text-xs bg-gray-100 rounded px-2 py-0.5"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <details className="text-sm text-gray-600 mt-2">
          <summary className="cursor-pointer text-indigo-600">
            Ver descrição completa
          </summary>
          <p className="mt-2 whitespace-pre-wrap">{vaga.descricao_completa}</p>
        </details>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Análises feitas para essa vaga</h2>
          <Link
            to={`/vagas/${vaga.id}/reanalisar`}
            className="bg-indigo-600 text-white rounded px-3 py-1.5 text-sm"
          >
            Reanalisar
          </Link>
        </div>

        {analises.length === 0 && (
          <p className="text-gray-500 text-sm">
            Nenhuma análise registrada para essa vaga ainda.
          </p>
        )}

        <ul className="space-y-2">
          {analises.map((analise) => (
            <li key={analise.id} className="border rounded p-3">
              <Link
                to={`/vagas/${vaga.id}/candidatura/${analise.candidatura_id}/resultado`}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-500">
                  {new Date(analise.created_at).toLocaleDateString("pt-BR")}
                </span>
                <span className="font-bold text-indigo-600">
                  {analise.score_match}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
