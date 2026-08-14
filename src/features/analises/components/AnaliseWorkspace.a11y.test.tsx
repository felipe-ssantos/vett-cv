import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "../../../components/layout/Layout";
import { AnaliseWorkspace } from "./AnaliseWorkspace";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {},
}));

// Cota normal — o indicador (badge + barra de progresso) entra no DOM auditado
// pelo axe.
vi.mock("../hooks/useCotaAnalises", () => ({
  useCotaAnalises: () => ({
    cota: {
      sessao: { usado: 2, limite: 5, restante: 3 },
      global: { usado: 10, limite: 100, restante: 90 },
      renovaEm: "2026-08-09T15:00:00.000Z",
      renovaEmGlobal: "2026-08-10T00:00:00.000Z",
    },
    carregando: false,
    atualizarCota: vi.fn(),
  }),
}));

describe("AnaliseWorkspace (acessibilidade)", () => {
  it("expõe labels acessíveis nos campos e não viola as regras do axe", async () => {
    const { container } = render(
      <MemoryRouter>
        <Layout>
          <AnaliseWorkspace />
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("Currículo")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição da vaga")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Ou envie o arquivo do currículo"),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
