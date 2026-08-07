import {
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

export const TAMANHO_MAXIMO_ARQUIVO = 4 * 1024 * 1024; // 4 MB

// Mantido abaixo do limite de ~4.5 MB de body das funções do Vercel, para a
// falha vir com mensagem clara em vez de 413 HTML.
export const ROTULO_TAMANHO_MAXIMO = "4 MB";

export interface UseArquivoCurriculoParams {
  /** Limite em bytes. Padrão: 4 MB (limite das funções do Vercel). */
  tamanhoMaximoBytes?: number;
  /** Rótulo amigável usado nas mensagens de ajuda/erro. */
  rotuloTamanhoMaximo?: string;
  /** Chamado após um arquivo válido ser selecionado (ex.: limpar o texto colado). */
  onArquivoSelecionado?: () => void;
}

export interface UseArquivoCurriculoReturn {
  arquivo: File | null;
  erroArquivo: string | null;
  arquivoInputRef: RefObject<HTMLInputElement | null>;
  handleArquivoChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRemoverArquivo: () => void;
  /** Descarta o arquivo (e o erro) quando o usuário digita no campo de texto. */
  limparArquivo: () => void;
}

/**
 * Encapsula o upload de currículo: seleção, validação de tamanho com
 * mensagem de erro, remoção com restauração de foco e descarte ao digitar.
 * Compartilhado por AnaliseWorkspace e ReanalisarForm.
 */
export function useArquivoCurriculo({
  tamanhoMaximoBytes = TAMANHO_MAXIMO_ARQUIVO,
  rotuloTamanhoMaximo = ROTULO_TAMANHO_MAXIMO,
  onArquivoSelecionado,
}: UseArquivoCurriculoParams = {}): UseArquivoCurriculoReturn {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  function handleArquivoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > tamanhoMaximoBytes) {
      setErroArquivo(
        `O arquivo excede o limite de ${rotuloTamanhoMaximo}. Envie um arquivo menor.`,
      );
      setArquivo(null);
      e.target.value = "";
      return;
    }
    setErroArquivo(null);
    setArquivo(file);
    if (file) onArquivoSelecionado?.();
  }

  function handleRemoverArquivo() {
    setArquivo(null);
    setErroArquivo(null);
    if (arquivoInputRef.current) {
      arquivoInputRef.current.value = "";
      arquivoInputRef.current.focus();
    }
  }

  function limparArquivo() {
    setArquivo(null);
    setErroArquivo(null);
  }

  return {
    arquivo,
    erroArquivo,
    arquivoInputRef,
    handleArquivoChange,
    handleRemoverArquivo,
    limparArquivo,
  };
}
