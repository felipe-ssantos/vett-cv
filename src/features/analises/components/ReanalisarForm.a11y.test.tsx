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
