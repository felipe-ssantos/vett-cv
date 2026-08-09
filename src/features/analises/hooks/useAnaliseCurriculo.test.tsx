import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeEvent, FormEvent } from "react";
import type { RespostaAnalisar } from "../../../lib/analisarApi";
import { useAnaliseCurriculo } from "./useAnaliseCurriculo";

const { mockEnviarAnalise, mockInsert, mockSupabase } = vi.hoisted(() => {
  const mockEnviarAnalise = vi.fn<
    (formData: FormData) => Promise<RespostaAnalisar>
  >();
  // Mantém a forma de um .then() encadeável: o hook chama
  // supabase.from(...).insert(...).then(...) — sem isso, o retorno undefined
  // lançaria um TypeError engolido pelo try/catch do hook.
  const mockInsert = vi.fn<
    (registro: Record<string, unknown>) => { then: () => void }
  >(() => ({ then: () => undefined }));
  return {
    mockEnviarAnalise,
    mockInsert,
    mockSupabase: { from: vi.fn(() => ({ insert: mockInsert })) },
  };
});

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: mockSupabase,
}));

vi.mock("../../../lib/analisarApi", () => ({
  enviarAnalise: mockEnviarAnalise,
}));

const respostaMock = {
  vaga: {
    titulo: "Analista de Dados",
    empresa: "Tech Corp",
    hardSkills: ["SQL"],
    softSkills: ["Comunicação"],
    senioridade: "Pleno",
  },
  analise: {
    scoreMatch: 85,
    matchPorCategoria: {
      skills_tecnicas: 90,
      ferramentas: 80,
      experiencia: 70,
      soft_skills: 85,
    },
    keywordsPresentes: ["SQL"],
    keywordsFaltando: ["Python"],
    pontosFortes: ["Experiência"],
    sugestoesAjuste: ["Aprender Python"],
    resumoIA: "Bom alinhamento",
    dicaFinal: "Invista em Python",
  },
};

function eventoDeSubmit(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

function eventoDeTexto(value: string): ChangeEvent<HTMLTextAreaElement> {
  return { target: { value } } as unknown as ChangeEvent<HTMLTextAreaElement>;
}

function eventoDeArquivo(arquivo: File | null): ChangeEvent<HTMLInputElement> {
  return {
    target: { files: arquivo ? [arquivo] : [], value: "" },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

function criarArquivo(): File {
  return new File(["currículo"], "curriculo.pdf", {
    type: "application/pdf",
  });
}

beforeEach(() => {
  mockEnviarAnalise.mockReset();
  mockInsert.mockClear();
});

describe("useAnaliseCurriculo", () => {
  it("rejeita o submit sem descrição da vaga", async () => {
    const { result } = renderHook(() => useAnaliseCurriculo());

    await act(async () => {
      await result.current.handleSubmit(eventoDeSubmit());
    });

    expect(result.current.erro).toBe("Cole a descrição da oportunidade.");
    expect(mockEnviarAnalise).not.toHaveBeenCalled();
  });

  it("rejeita o submit sem currículo nem arquivo", async () => {
    const { result } = renderHook(() => useAnaliseCurriculo());

    act(() => {
      result.current.handleDescricaoChange(eventoDeTexto("Vaga de analista"));
    });

    await act(async () => {
      await result.current.handleSubmit(eventoDeSubmit());
    });

    expect(result.current.erro).toBe(
      "Cole o texto do currículo ou envie um arquivo PDF/DOCX.",
    );
    expect(mockEnviarAnalise).not.toHaveBeenCalled();
  });

  it("submete com sucesso, mede o tempo e persiste no histórico", async () => {
    mockEnviarAnalise.mockResolvedValue(respostaMock);
    const { result } = renderHook(() => useAnaliseCurriculo());

    act(() => {
      result.current.handleDescricaoChange(eventoDeTexto("Vaga de analista"));
      result.current.handleCurriculoChange(eventoDeTexto("Currículo do candidato"));
    });

    await act(async () => {
      await result.current.handleSubmit(eventoDeSubmit());
    });

    expect(mockEnviarAnalise).toHaveBeenCalledTimes(1);
    const formData = mockEnviarAnalise.mock.calls[0][0];
    expect(formData.get("descricaoVaga")).toBe("Vaga de analista");
    expect(formData.get("curriculoTexto")).toBe("Currículo do candidato");

    expect(result.current.analise?.scoreMatch).toBe(85);
    expect(result.current.tempoAnalise).not.toBeNull();
    expect(result.current.analisando).toBe(false);
    expect(result.current.erro).toBeNull();

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const registro = mockInsert.mock.calls[0][0];
    expect(registro.titulo_vaga).toBe("Analista de Dados");
    expect(registro.score_match).toBe(85);
    expect(registro.descricao_vaga).toBe("Vaga de analista");
    // Guarda de PII: o texto integral do currículo não deve ser persistido.
    expect(registro.curriculo_texto).toBeUndefined();
  });

  it("digitar no campo de currículo descarta o arquivo selecionado", () => {
    const { result } = renderHook(() => useAnaliseCurriculo());

    act(() => {
      result.current.handleArquivoChange(eventoDeArquivo(criarArquivo()));
    });
    expect(result.current.arquivo).not.toBeNull();

    act(() => {
      result.current.handleCurriculoChange(eventoDeTexto("texto digitado"));
    });

    expect(result.current.arquivo).toBeNull();
    expect(result.current.curriculoTexto).toBe("texto digitado");
  });

  it("selecionar um arquivo descarta o texto colado", () => {
    const { result } = renderHook(() => useAnaliseCurriculo());

    act(() => {
      result.current.handleCurriculoChange(eventoDeTexto("texto colado"));
    });
    expect(result.current.curriculoTexto).toBe("texto colado");

    act(() => {
      result.current.handleArquivoChange(eventoDeArquivo(criarArquivo()));
    });

    expect(result.current.curriculoTexto).toBe("");
    expect(result.current.arquivo).not.toBeNull();
  });

  it("limpa a descrição da vaga ao chamar handleLimparDescricao", () => {
    const { result } = renderHook(() => useAnaliseCurriculo());

    act(() => {
      result.current.handleDescricaoChange(eventoDeTexto("Vaga de analista"));
    });
    expect(result.current.descricaoVaga).toBe("Vaga de analista");

    act(() => {
      result.current.handleLimparDescricao();
    });

    expect(result.current.descricaoVaga).toBe("");
  });
});
