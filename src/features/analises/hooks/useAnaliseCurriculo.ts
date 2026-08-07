import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import { supabase } from "../../../lib/supabaseClient";
import { enviarAnalise, type RespostaAnalisar } from "../../../lib/analisarApi";
import { lerTextoDaAreaDeTransferencia } from "../../../lib/areaTransferencia";
import type { AnaliseMatchIA, VagaExtraidaIA } from "../../../types";

export const LIMITE_CARACTERES = 5000;
export const ROTULO_TAMANHO_MAXIMO = "4 MB";
export const ETAPAS_ANALISE = [
  "Lendo seu currículo...",
  "Interpretando a oportunidade...",
  "Comparando skills e experiência...",
  "Gerando recomendações...",
];

// Mantido abaixo do limite de ~4.5 MB de body das funções do Vercel, para a
// falha vir com mensagem clara em vez de 413 HTML.
const TAMANHO_MAXIMO_ARQUIVO = 4 * 1024 * 1024; // 4 MB

const INTERVALO_ETAPA_MS = 1800;

// `performance.now()` é impuro — a regra `react-hooks/purity` proíbe chamá-lo
// dentro de custom hooks. Isolado no escopo de módulo, o corpo do hook
// permanece puro e a medição continua correta em handlers de evento.
function agoraEmMilissegundos(): number {
  return performance.now();
}

export interface UseAnaliseCurriculoReturn {
  descricaoVaga: string;
  curriculoTexto: string;
  arquivo: File | null;
  arquivoInputRef: RefObject<HTMLInputElement | null>;
  analisando: boolean;
  erro: string | null;
  erroArquivo: string | null;
  avisoSalvamento: string | null;
  analise: AnaliseMatchIA | null;
  tempoAnalise: number | null;
  etapaAtual: number;
  handleCurriculoChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleDescricaoChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleArquivoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRemoverArquivo: () => void;
  handleColarCurriculo: () => Promise<void>;
  handleColarDescricao: () => Promise<void>;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * Encapsula todo o fluxo de análise do currículo: campos do formulário,
 * upload de arquivo, colagem da área de transferência, chamada da API,
 * animação de etapas e persistência no histórico (Supabase).
 */
export function useAnaliseCurriculo(): UseAnaliseCurriculoReturn {
  const [descricaoVaga, setDescricaoVaga] = useState("");
  const [curriculoTexto, setCurriculoTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [avisoSalvamento, setAvisoSalvamento] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseMatchIA | null>(null);
  const [tempoAnalise, setTempoAnalise] = useState<number | null>(null);
  const [etapaAtual, setEtapaAtual] = useState(0);

  const arquivoInputRef = useRef<HTMLInputElement>(null);

  // Rotaciona a etapa exibida enquanto a análise está em andamento.
  useEffect(() => {
    if (!analisando) return;
    const intervalo = setInterval(() => {
      setEtapaAtual((atual) => (atual + 1) % ETAPAS_ANALISE.length);
    }, INTERVALO_ETAPA_MS);
    return () => clearInterval(intervalo);
  }, [analisando]);

  function handleCurriculoChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const texto = e.target.value;
    setCurriculoTexto(texto);
    // Digitar no campo invalida o arquivo selecionado (o texto tem prioridade).
    if (texto) setArquivo(null);
  }

  function handleDescricaoChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setDescricaoVaga(e.target.value);
  }

  function handleArquivoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > TAMANHO_MAXIMO_ARQUIVO) {
      setErroArquivo(
        `O arquivo excede o limite de ${ROTULO_TAMANHO_MAXIMO}. Envie um arquivo menor.`,
      );
      setArquivo(null);
      e.target.value = "";
      return;
    }
    setErroArquivo(null);
    setArquivo(file);
    if (file) setCurriculoTexto("");
  }

  function handleRemoverArquivo() {
    setArquivo(null);
    setErroArquivo(null);
    if (arquivoInputRef.current) {
      arquivoInputRef.current.value = "";
      arquivoInputRef.current.focus();
    }
  }

  /** Lê a área de transferência e aplica o texto (limitado) a um campo. */
  async function colarDaAreaDeTransferencia(
    aplicar: (texto: string) => void,
    aoColar?: () => void,
  ): Promise<void> {
    try {
      const texto = await lerTextoDaAreaDeTransferencia();
      if (texto) {
        aplicar(texto.slice(0, LIMITE_CARACTERES));
        aoColar?.();
      }
    } catch (err) {
      console.error("Falha ao colar:", err);
      alert(err instanceof Error ? err.message : "Não foi possível colar.");
    }
  }

  function handleColarCurriculo(): Promise<void> {
    return colarDaAreaDeTransferencia(setCurriculoTexto, () => setArquivo(null));
  }

  function handleColarDescricao(): Promise<void> {
    return colarDaAreaDeTransferencia(setDescricaoVaga);
  }

  /** Valida os campos e dispara a análise (event handler de submit). */
  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!descricaoVaga.trim()) {
      setErro("Cole a descrição da oportunidade.");
      return;
    }
    if (!curriculoTexto.trim() && !arquivo) {
      setErro("Cole o texto do currículo ou envie um arquivo PDF/DOCX.");
      return;
    }

    setAnalisando(true);
    setErro(null);
    setAvisoSalvamento(null);
    setEtapaAtual(0);
    const inicio = agoraEmMilissegundos();

    try {
      const dados = await enviarAnalise(montarFormData());
      const vagaExtraida = dados.vaga;
      if (!vagaExtraida) {
        throw new Error("A resposta da análise veio incompleta. Tente novamente.");
      }
      setAnalise(dados.analise);
      setTempoAnalise((agoraEmMilissegundos() - inicio) / 1000);
      salvarNoHistorico(vagaExtraida, dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado na análise.");
    } finally {
      setAnalisando(false);
    }
  }

  function montarFormData(): FormData {
    const formData = new FormData();
    formData.append("descricaoVaga", descricaoVaga);
    if (arquivo) {
      formData.append("arquivo", arquivo);
    } else {
      formData.append("curriculoTexto", curriculoTexto);
    }
    return formData;
  }

  /** Persiste a análise no histórico; falhas viram aviso, nunca erro fatal. */
  function salvarNoHistorico(vaga: VagaExtraidaIA, dados: RespostaAnalisar) {
    supabase
      .from("analises")
      .insert({
        titulo_vaga: vaga.titulo,
        empresa: vaga.empresa,
        descricao_vaga: descricaoVaga,
        hard_skills: vaga.hardSkills,
        soft_skills: vaga.softSkills,
        senioridade: vaga.senioridade,
        curriculo_texto: dados.curriculoTexto,
        score_match: dados.analise.scoreMatch,
        match_por_categoria: dados.analise.matchPorCategoria,
        keywords_presentes: dados.analise.keywordsPresentes,
        keywords_faltando: dados.analise.keywordsFaltando,
        pontos_fortes: dados.analise.pontosFortes,
        sugestoes_ajuste: dados.analise.sugestoesAjuste,
        resumo_ia: dados.analise.resumoIA,
        dica_final: dados.analise.dicaFinal,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Falha ao salvar no histórico:", error);
          setAvisoSalvamento(
            "A análise foi gerada, mas não foi possível salvá-la no histórico. Verifique bloqueios de privacidade/anti-rastreamento do navegador e tente novamente.",
          );
        }
      });
  }

  return {
    descricaoVaga,
    curriculoTexto,
    arquivo,
    arquivoInputRef,
    analisando,
    erro,
    erroArquivo,
    avisoSalvamento,
    analise,
    tempoAnalise,
    etapaAtual,
    handleCurriculoChange,
    handleDescricaoChange,
    handleArquivoChange,
    handleRemoverArquivo,
    handleColarCurriculo,
    handleColarDescricao,
    handleSubmit,
  };
}
