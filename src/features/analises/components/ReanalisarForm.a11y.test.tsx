import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../../components/layout/Layout";
import { analiseFixture } from "../../../test/fixtures";
import { ReanalisarForm } from "./ReanalisarForm";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: supabaseMocks.from },
}));

// Cota normal — o indicador entra no DOM auditado pelo axe.
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

beforeEach(() => {
  supabaseMocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: vi
          .fn()
          .mockResolvedValue({ data: analiseFixture, error: null }),
      }),
    }),
  });
});

describe("ReanalisarForm (acessibilidade)", () => {
  it("expõe labels acessíveis e não viola as regras do axe", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/analises/analise-1/reanalisar"]}>
        <Layout>
          <Routes>
            <Route
              path="/analises/:id/reanalisar"
              element={<ReanalisarForm />}
            />
          </Routes>
        </Layout>
      </MemoryRouter>,
    );

    expect(
      await screen.findByLabelText("Cole o novo texto do currículo"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Envie o arquivo do currículo"),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
