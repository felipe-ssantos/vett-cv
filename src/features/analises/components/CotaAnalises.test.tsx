import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CotaAnalises as TipoCotaAnalises } from "../../../lib/usoApi";
import { CotaAnalises } from "./CotaAnalises";

function montarCota(
  sessao: TipoCotaAnalises["sessao"],
  renovaEm: string | null,
  renovaEmGlobal: string | null = null,
  global: TipoCotaAnalises["global"] = {
    usado: 10,
    limite: 100,
    restante: 90,
  },
): TipoCotaAnalises {
  return { sessao, global, renovaEm, renovaEmGlobal };
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
      screen.getByText(/Limite de análises atingido/),
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
      screen.getByText(/Limite de análises atingido/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Renova às \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.queryByText(/Renova em/)).not.toBeInTheDocument();
  });

  it("mostra a barra de progresso com as análises restantes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));

    render(
      <CotaAnalises
        cota={montarCota({ usado: 3, limite: 5, restante: 2 }, null)}
        carregando={false}
      />,
    );

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "2");
    expect(barra).toHaveAttribute("aria-valuemax", "5");
    // 2 de 5 restantes → 40% da barra preenchida.
    expect(barra.firstElementChild).toHaveStyle({ width: "40%" });
  });

  it("esvazia a barra de progresso quando a cota esgota", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-09T12:00:00Z"));

    render(
      <CotaAnalises
        cota={montarCota({ usado: 5, limite: 5, restante: 0 }, null)}
        carregando={false}
      />,
    );

    const barra = screen.getByRole("progressbar");
    expect(barra).toHaveAttribute("aria-valuenow", "0");
    expect(barra.firstElementChild).toHaveStyle({ width: "0%" });
  });

  it("mostra a renovação da meia-noite UTC quando o teto global esgota", () => {
    vi.useFakeTimers();
    // 20:00 UTC — a janela de 3h renova às 21:00; o teto global, à meia-noite.
    vi.setSystemTime(new Date("2026-08-09T20:00:00Z"));
    const renovaEmJanela = new Date("2026-08-09T21:00:00Z").toISOString();
    const renovaEmGlobal = new Date("2026-08-10T00:00:00Z").toISOString();

    render(
      <CotaAnalises
        cota={montarCota(
          { usado: 2, limite: 5, restante: 3 },
          renovaEmJanela,
          renovaEmGlobal,
          { usado: 100, limite: 100, restante: 0 },
        )}
        carregando={false}
      />,
    );

    expect(
      screen.getByText(/Cota global do dia atingida/),
    ).toBeInTheDocument();
    // Renova em 4h (20:00 → 00:00 UTC) — o tempo do teto global, não o da
    // janela de 3h (que seria "Renova em 1h").
    expect(screen.getByText(/Renova em 4h/)).toBeInTheDocument();
    expect(screen.queryByText(/Renova em 1h/)).not.toBeInTheDocument();
  });
});
