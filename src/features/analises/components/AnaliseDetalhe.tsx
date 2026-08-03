import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";
import type { Analise } from "../../../types";

const LABELS_CATEGORIA: Record<string, string> = {
  skills_tecnicas: "Skills técnicas",
  ferramentas: "Ferramentas",
  experiencia: "Experiência",
  soft_skills: "Soft skills",
};

function BarraCategoria({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{valor}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full"
          style={{ width: `${valor}%` }}
        />
      </div>
    </div>
  );
}

export function AnaliseDetalhe() {
  const { id } = useParams();
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarAnalise() {
      const { data, error } = await supabase
        .from("analises")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setErro("Não foi possível carregar a análise.");
      } else {
        setAnalise(data);
      }
      setCarregando(false);
    }
    if (id) carregarAnalise();
  }, [id]);

  if (carregando) return <p>Carregando análise...</p>;
  if (erro || !analise) return <p className="text-red-600">{erro}</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link to="/historico" className="text-sm text-indigo-600">
          ← Voltar ao histórico
        </Link>
      </div>

      <div className="border rounded p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h1 className="text-2xl font-bold">{analise.titulo_vaga}</h1>
          {analise.senioridade && (
            <span className="text-xs bg-gray-100 rounded px-2 py-0.5 whitespace-nowrap">
              {analise.senioridade}
            </span>
          )}
        </div>
        {analise.empresa && (
          <p className="text-gray-500 mb-3">{analise.empresa}</p>
        )}

        {analise.hard_skills.length > 0 && (
          <div className="mb-2">
            <p className="text-sm font-medium mb-1">Hard skills</p>
            <div className="flex flex-wrap gap-1">
              {analise.hard_skills.map((s) => (
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

        {analise.soft_skills.length > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium mb-1">Soft skills</p>
            <div className="flex flex-wrap gap-1">
              {analise.soft_skills.map((s) => (
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
          <p className="mt-2 whitespace-pre-wrap">{analise.descricao_vaga}</p>
        </details>
      </div>

      <div className="text-center border rounded p-6">
        <div className="text-5xl font-bold text-indigo-600">
          {analise.score_match}%
        </div>
        <p className="text-gray-600 mt-2">{analise.resumo_ia}</p>
      </div>

      {analise.match_por_categoria && (
        <div className="border rounded p-4">
          <h2 className="text-lg font-bold mb-3">Match por categoria</h2>
          {Object.entries(analise.match_por_categoria).map(([chave, valor]) => (
            <BarraCategoria
              key={chave}
              label={LABELS_CATEGORIA[chave] ?? chave}
              valor={valor as number}
            />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h2 className="text-lg font-bold mb-2">Palavras-chave presentes</h2>
          <div className="flex flex-wrap gap-1">
            {analise.keywords_presentes.map((k) => (
              <span
                key={k}
                className="text-xs bg-green-100 text-green-800 rounded px-2 py-1"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="border rounded p-4">
          <h2 className="text-lg font-bold mb-2">Palavras-chave faltando</h2>
          <div className="flex flex-wrap gap-1">
            {analise.keywords_faltando.map((k) => (
              <span
                key={k}
                className="text-xs bg-red-100 text-red-800 rounded px-2 py-1"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded p-4">
        <h2 className="text-lg font-bold mb-2">Sugestões de ajuste</h2>
        <ul className="list-disc list-inside space-y-1 text-sm">
          {analise.sugestoes_ajuste.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>

      <div className="border rounded p-4 bg-indigo-50">
        <h2 className="text-sm font-medium text-indigo-800 mb-1">
          Dica para aumentar sua %
        </h2>
        <p className="text-sm text-indigo-900">{analise.dica_final}</p>
      </div>

      <div className="flex justify-end">
        <Link
          to={`/analises/${analise.id}/reanalisar`}
          className="bg-indigo-600 text-white rounded px-3 py-1.5 text-sm"
        >
          Reanalisar com outro currículo
        </Link>
      </div>
    </div>
  );
}
