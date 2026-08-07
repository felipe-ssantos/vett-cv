import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../../components/layout/Layout";
import { analiseFixture } from "../../../test/fixtures";
import { AnaliseDetalhe } from "./AnaliseDetalhe";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: supabaseMocks.from },
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

function renderizar() {
  return render(
    <MemoryRouter initialEntries={["/analises/analise-1"]}>
      <Layout>
        <Routes>
          <Route path="/analises/:id" element={<AnaliseDetalhe />} />
        </Routes>
      </Layout>
    </MemoryRouter>,
  );
}

describe("AnaliseDetalhe (acessibilidade)", () => {
  it("renderiza a análise sem violar as regras do axe", async () => {
    const { container } = renderizar();

    expect(
      await screen.findByRole("heading", {
        name: "Analista de Dados Sênior",
        level: 1,
      }),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("diálogo de exclusão é acessível", async () => {
    const user = userEvent.setup();
    const { container } = renderizar();

    await screen.findByRole("heading", { level: 1 });
    await user.click(screen.getByRole("button", { name: "Excluir análise" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Excluir análise?",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
