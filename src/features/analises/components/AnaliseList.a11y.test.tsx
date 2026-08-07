import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "../../../components/layout/Layout";
import { analisesFixture } from "../../../test/fixtures";
import { AnaliseList } from "./AnaliseList";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
  },
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <Layout>
        <AnaliseList />
      </Layout>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  supabaseMocks.getUser.mockResolvedValue({
    data: { user: { id: "usuario-teste" } },
  });
  supabaseMocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: vi
          .fn()
          .mockResolvedValue({ data: analisesFixture, error: null }),
      }),
    }),
  });
});

describe("AnaliseList (acessibilidade)", () => {
  it("expõe label acessível na busca e não viola as regras do axe", async () => {
    const { container } = renderizar();

    expect(
      await screen.findByLabelText("Pesquisar no histórico de análises"),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("diálogo de exclusão do histórico é acessível", async () => {
    const user = userEvent.setup();
    const { container } = renderizar();

    await user.click(
      await screen.findByRole("button", { name: "Limpar histórico" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Excluir todo o histórico?",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
