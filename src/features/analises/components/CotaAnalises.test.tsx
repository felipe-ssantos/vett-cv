import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CotaAnalises as TipoCotaAnalises } from "../../../lib/usoApi";
import { CotaAnalises } from "./CotaAnalises";

function montarCota(
  sessao: TipoCotaAnalises["sessao"],
  renovaEm: string | null,
): TipoCotaAnalises {
  return {
    sessao,
    global: { usado: 10, limite: 100, restante: 90 },
    renovaEm,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CotaAnalises — renovação exata", () => {
  it("mostra análises disponíveis, tempo restante e a hora exata da renovação", () => {
    vi.useFakeTimers();
    // 12:00 UTC, renovação às 15:00 UTC (fim da janela de 3h).
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    const renovaEm = new Date("2026-08-09T15:00:00Z").toISOString();

    render(
      <CotaAnalises
        cota={montarCota({ usado: 3, limite: 5, restante: 2 }, renovaEm)}
        carregando={false}
      />,
    );

    expect(
      screen.getByText(/2 de 5 análises disponíveis/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Renova em 3h/)).toBeInTheDocument();
    // Hora exata da próxima renovação, no fuso local do navegador.
    expect(screen.getByText(/às \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("mostra o bloqueio com a renovação exata quando a cota esgota", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));
    const renovaEm = new Date("2026-08-09T15:00:00Z").toISOString();

    render(
      <CotaAnalises
        cota={montarCota({ usado: 5, limite: 5, restante: 0 }, renovaEm)}
        carregando={false}
      />,
    );

    expect(
      screen.getByText(/Limite de análises desta janela atingido/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Renova em 3h \(às \d{2}:\d{2}\)/)).toBeInTheDocument();
  });

  it("não exibe nada enquanto carrega sem cota", () => {
    render(<CotaAnalises cota={null} carregando />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não exibe nada quando a cota está indisponível", () => {
    render(<CotaAnalises cota={null} carregando={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mostra só a hora exata quando a janela já renovou", () => {
    vi.useFakeTimers();
    // Renovação às 15:00 UTC, mas o relógio do usuário já passou dela
    // (15:05 UTC) e a cota ainda não foi recarregada.
    vi.setSystemTime(new Date("2026-08-09T15:05:00Z"));
    const renovaEm = new Date("2026-08-09T15:00:00Z").toISOString();

    render(
      <CotaAnalises
        cota={montarCota({ usado: 5, limite: 5, restante: 0 }, renovaEm)}
        carregando={false}
      />,
    );

    expect(
      screen.getByText(/Limite de análises desta janela atingido/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Renova às \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/Renova em/)).not.toBeInTheDocument();
  });
});
