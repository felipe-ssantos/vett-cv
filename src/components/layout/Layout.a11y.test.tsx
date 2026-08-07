import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Layout } from "./Layout";

describe("Layout (acessibilidade)", () => {
  it("oferece skip link, landmarks nomeadas e não viola as regras do axe", async () => {
    const { container } = render(
      <MemoryRouter>
        <Layout>
          <h1>Conteúdo da página</h1>
        </Layout>
      </MemoryRouter>,
    );

    expect(screen.getByText("Pular para o conteúdo")).toHaveAttribute(
      "href",
      "#conteudo-principal",
    );
    expect(
      screen.getByRole("navigation", { name: "Navegação principal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute(
      "id",
      "conteudo-principal",
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
