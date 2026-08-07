import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChangeEvent } from "react";
import {
  TAMANHO_MAXIMO_ARQUIVO,
  useArquivoCurriculo,
} from "./useArquivoCurriculo";

function criarArquivo(bytes: number): File {
  return new File(["x".repeat(bytes)], "curriculo.pdf", {
    type: "application/pdf",
  });
}

function simularSelecaoDeArquivo(
  arquivo: File | null,
): ChangeEvent<HTMLInputElement> {
  return {
    target: { files: arquivo ? [arquivo] : [], value: "" },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

describe("useArquivoCurriculo", () => {
  it("aceita arquivo válido, armazena e chama onArquivoSelecionado", () => {
    const onArquivoSelecionado = vi.fn();
    const { result } = renderHook(() =>
      useArquivoCurriculo({ onArquivoSelecionado }),
    );

    act(() => {
      result.current.handleArquivoChange(
        simularSelecaoDeArquivo(criarArquivo(10)),
      );
    });

    expect(result.current.arquivo?.name).toBe("curriculo.pdf");
    expect(result.current.erroArquivo).toBeNull();
    expect(onArquivoSelecionado).toHaveBeenCalledTimes(1);
  });

  it("rejeita arquivo acima do limite com mensagem clara", () => {
    const { result } = renderHook(() => useArquivoCurriculo());

    act(() => {
      result.current.handleArquivoChange(
        simularSelecaoDeArquivo(criarArquivo(TAMANHO_MAXIMO_ARQUIVO + 1)),
      );
    });

    expect(result.current.arquivo).toBeNull();
    expect(result.current.erroArquivo).toBe(
      "O arquivo excede o limite de 4 MB. Envie um arquivo menor.",
    );
  });

  it("aceita arquivo exatamente no limite", () => {
    const { result } = renderHook(() => useArquivoCurriculo());

    act(() => {
      result.current.handleArquivoChange(
        simularSelecaoDeArquivo(criarArquivo(TAMANHO_MAXIMO_ARQUIVO)),
      );
    });

    expect(result.current.arquivo).not.toBeNull();
    expect(result.current.erroArquivo).toBeNull();
  });

  it("limpa o arquivo e o erro com limparArquivo", () => {
    const { result } = renderHook(() => useArquivoCurriculo());

    // Rejeita um arquivo grande (erro) e depois seleciona um válido.
    act(() => {
      result.current.handleArquivoChange(
        simularSelecaoDeArquivo(criarArquivo(TAMANHO_MAXIMO_ARQUIVO + 1)),
      );
      result.current.handleArquivoChange(simularSelecaoDeArquivo(criarArquivo(10)));
    });
    expect(result.current.erroArquivo).toBeNull();
    expect(result.current.arquivo).not.toBeNull();

    act(() => {
      result.current.limparArquivo();
    });

    expect(result.current.arquivo).toBeNull();
    expect(result.current.erroArquivo).toBeNull();
  });
});
