import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CotaAnalises } from "./CotaAnalises";
import type { CotaAnalises as TipoCotaAnalises } from "../../../lib/usoApi";

const OITO_HORAS_E_MEIA = (8 * 3600 + 30 * 60) * 1000;

function criarCota(sobrescrever?: Partial<TipoCotaAnalises>): TipoCotaAnalises {
  return {
    sessao: { usado: 2, limite: 5, restante: 3 },
    global: { usado: 42, limite: 100, restante: 58 },
    renovaEm: new Date(Date.now() + OITO_HORAS_E_MEIA).toISOString(),
    ...sobrescrever,
  };
}

describe("CotaAnalises", () => {
  it("mostra as análises restantes, a renovação e o uso global", () => {
    render(<CotaAnalises cota={criarCota()} carregando={false} />);

    const caixa = screen.getByRole("status");
    expect(caixa).toHaveTextContent("3 de 5 análises hoje");
    expect(caixa).toHaveTextContent("Renova em 8h 30min");
    expect(caixa).toHaveTextContent("global: 42/100");
  });

  it("mostra estado bloqueado quando a cota da sessão esgota", () => {
    render(
      <CotaAnalises
        cota={criarCota({
          sessao: { usado: 5, limite: 5, restante: 0 },
        })}
        carregando={false}
      />,
    );

    const caixa = screen.getByRole("status");
    expect(caixa).toHaveTextContent("Limite de análises de hoje atingido");
    expect(caixa).toHaveTextContent("Renova em 8h 30min");
    expect(caixa).not.toHaveTextContent("global:");
  });

  it("mostra estado bloqueado quando a cota global esgota", () => {
    render(
      <CotaAnalises
        cota={criarCota({
          global: { usado: 100, limite: 100, restante: 0 },
        })}
        carregando={false}
      />,
    );

    const caixa = screen.getByRole("status");
    expect(caixa).toHaveTextContent("Cota global do dia atingida");
  });

  it("não renderiza nada enquanto carrega pela primeira vez", () => {
    const { container } = render(
      <CotaAnalises cota={null} carregando={true} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada quando a cota está indisponível", () => {
    const { container } = render(
      <CotaAnalises cota={null} carregando={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
