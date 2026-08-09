import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { Layout } from "./Layout";

const CHAVE = "vett-consentimento-privacidade";

function renderizarLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <h1>Página de teste</h1>
      </Layout>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Layout — banner de consentimento (integração)", () => {
  it("exibe o banner junto do Layout e o oculta ao aceitar", async () => {
    const user = userEvent.setup();
    renderizarLayout();

    expect(
      screen.getByRole("region", { name: "Aviso de privacidade" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceitar" }));

    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(CHAVE)).toBe("aceito");
  });

  it("não reexibe o banner após recusar e remontar o layout", async () => {
    const user = userEvent.setup();
    const primeira = renderizarLayout();
    await user.click(screen.getByRole("button", { name: "Agora não" }));
    primeira.unmount();

    renderizarLayout();

    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(CHAVE)).toBe("recusado");
  });

  it("mantém o banner visível em páginas fora da Política de Privacidade", () => {
    renderizarLayout();
    expect(
      screen.getByRole("region", { name: "Aviso de privacidade" }),
    ).toBeInTheDocument();
    // O link do banner leva à Política de Privacidade.
    expect(
      screen.getByRole("link", { name: /Política de Privacidade/ }),
    ).toHaveAttribute("href", "/privacidade");
  });

  it("oculta o banner na própria página da Política de Privacidade", () => {
    render(
      <MemoryRouter initialEntries={["/privacidade"]}>
        <Layout>
          <h1>Política de Privacidade</h1>
        </Layout>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
  });
});
