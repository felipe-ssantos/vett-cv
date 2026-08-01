import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient";

export function VagaForm() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [descricaoCompleta, setDescricaoCompleta] = useState("");
  const [hardSkills, setHardSkills] = useState("");
  const [softSkills, setSoftSkills] = useState("");
  const [senioridade, setSenioridade] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function textoParaLista(texto: string): string[] {
    return texto
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const { error } = await supabase.from("vagas").insert({
      titulo,
      empresa: empresa || null,
      descricao_completa: descricaoCompleta,
      hard_skills: textoParaLista(hardSkills),
      soft_skills: textoParaLista(softSkills),
      senioridade: senioridade || null,
    });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível salvar a vaga.");
      console.error(error);
      return;
    }

    navigate("/");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        className="border rounded p-2 w-full"
        placeholder="Título da vaga"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        required
      />
      <input
        className="border rounded p-2 w-full"
        placeholder="Empresa (opcional)"
        value={empresa}
        onChange={(e) => setEmpresa(e.target.value)}
      />
      <textarea
        className="border rounded p-2 w-full"
        placeholder="Descrição completa da vaga"
        value={descricaoCompleta}
        onChange={(e) => setDescricaoCompleta(e.target.value)}
        rows={4}
        required
      />
      <input
        className="border rounded p-2 w-full"
        placeholder="Hard skills (separadas por vírgula: SQL, Python, Power BI)"
        value={hardSkills}
        onChange={(e) => setHardSkills(e.target.value)}
      />
      <input
        className="border rounded p-2 w-full"
        placeholder="Soft skills (separadas por vírgula)"
        value={softSkills}
        onChange={(e) => setSoftSkills(e.target.value)}
      />
      <input
        className="border rounded p-2 w-full"
        placeholder="Senioridade (opcional: Pleno, Sênior...)"
        value={senioridade}
        onChange={(e) => setSenioridade(e.target.value)}
      />
      <button
        type="submit"
        disabled={salvando}
        className="bg-indigo-600 text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {salvando ? "Salvando..." : "Cadastrar vaga"}
      </button>
      {erro && <p className="text-red-600 text-sm">{erro}</p>}
    </form>
  );
}
