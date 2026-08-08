import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCotaAnalises } from "./useCotaAnalises";

const mockBuscar = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/usoApi", () => ({
  buscarCotaAnalises: mockBuscar,
}));

const cotaMock = {
  sessao: { usado: 1, limite: 5, restante: 4 },
  global: { usado: 10, limite: 100, restante: 90 },
  renovaEm: "2026-08-08T00:00:00.000Z",
};

beforeEach(() => {
  mockBuscar.mockReset();
});

describe("useCotaAnalises", () => {
  it("carrega a cota na montagem", async () => {
    mockBuscar.mockResolvedValue(cotaMock);

    const { result } = renderHook(() => useCotaAnalises());

    await waitFor(() =>
      expect(result.current.cota?.sessao?.restante).toBe(4),
    );
    expect(result.current.carregando).toBe(false);
  });

  it("atualizarCota recarrega e atualiza o estado", async () => {
    mockBuscar
      .mockResolvedValueOnce(cotaMock)
      .mockResolvedValueOnce({
        ...cotaMock,
        sessao: { usado: 2, limite: 5, restante: 3 },
      });

    const { result } = renderHook(() => useCotaAnalises());
    await waitFor(() =>
      expect(result.current.cota?.sessao?.restante).toBe(4),
    );

    await act(async () => {
      await result.current.atualizarCota();
    });

    expect(mockBuscar).toHaveBeenCalledTimes(2);
    expect(result.current.cota?.sessao?.restante).toBe(3);
  });

  it("falha na busca resulta em cota null sem quebrar", async () => {
    mockBuscar.mockResolvedValue(null);

    const { result } = renderHook(() => useCotaAnalises());

    await waitFor(() => expect(result.current.carregando).toBe(false));
    expect(result.current.cota).toBeNull();
  });
});
