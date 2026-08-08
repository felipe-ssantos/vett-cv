import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Layout } from "../../components/layout/Layout";
import { Privacidade } from "./Privacidade";

function renderizar() {
  return render(
    <MemoryRouter>
      <Layout>
        <Privacidade />
      </Layout>
    </MemoryRouter>,
  );
}

describe("Privacidade (acessibilidade)", () => {
  it("renderiza o título com hierarquia de cabeçalhos correta e não viola o axe", async () => {
    const { container } = renderizar();

    expect(
      screen.getByRole("heading", {
        name: "Política de Privacidade",
        level: 1,
      }),
    ).toBeInTheDocument();

    // h1 seguido apenas de h2 (nenhum nível pulado).
    const niveis = screen
      .getAllByRole("heading")
      .map((h) => Number(h.tagName.slice(1)));
    expect(niveis[0]).toBe(1);
    expect(niveis.slice(1).every((nivel) => nivel === 2)).toBe(true);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("expõe links de navegação com texto visível", () => {
    renderizar();

    expect(
      screen.getByRole("link", { name: "Voltar ao início" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Gerenciar meu histórico" }),
    ).toBeInTheDocument();
  });
});
