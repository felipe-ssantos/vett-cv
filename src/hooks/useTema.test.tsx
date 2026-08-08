import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useTema } from "./useTema";

describe("useTema", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-bs-theme");
  });

  it("sincroniza com o tema já aplicado no <html> pelo script inicial", async () => {
    document.documentElement.setAttribute("data-bs-theme", "dark");

    const { result } = renderHook(() => useTema());

    await waitFor(() => expect(result.current.tema).toBe("dark"));
  });

  it("alterna o tema, aplica no <html> e persiste no localStorage", () => {
    const { result } = renderHook(() => useTema());
    expect(result.current.tema).toBe("light");

    act(() => result.current.alternarTema());

    expect(result.current.tema).toBe("dark");
    expect(document.documentElement.getAttribute("data-bs-theme")).toBe(
      "dark",
    );
    expect(localStorage.getItem("vett-tema")).toBe("dark");

    act(() => result.current.alternarTema());

    expect(result.current.tema).toBe("light");
    expect(localStorage.getItem("vett-tema")).toBe("light");
  });

  it("mantém o tema aplicado mesmo sem armazenamento disponível", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    try {
      const { result } = renderHook(() => useTema());
      act(() => result.current.alternarTema());

      expect(result.current.tema).toBe("dark");
      expect(document.documentElement.getAttribute("data-bs-theme")).toBe(
        "dark",
      );
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
