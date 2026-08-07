import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Layout } from "../../../components/layout/Layout";
import { AnaliseWorkspace } from "./AnaliseWorkspace";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {},
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
      screen.getByLabelText("Enviar arquivo do currículo em PDF, DOC ou DOCX"),
    ).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
