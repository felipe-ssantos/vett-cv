import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsentBanner } from "./ConsentBanner";

const CHAVE = "vett-consentimento-privacidade";

function renderizar(caminho = "/") {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <ConsentBanner />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("ConsentBanner", () => {
  it("mostra o banner quando o usuário ainda não respondeu", () => {
    renderizar();
    expect(
      screen.getByRole("region", { name: "Aviso de privacidade" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Política de Privacidade/ }),
    ).toBeInTheDocument();
  });

  it("esconde o banner após aceitar e persiste a escolha", async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole("button", { name: "Aceitar" }));
    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(CHAVE)).toBe("aceito");
  });

  it("esconde o banner após recusar e persiste a escolha", async () => {
    const user = userEvent.setup();
    renderizar();

    await user.click(screen.getByRole("button", { name: "Agora não" }));
    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(CHAVE)).toBe("recusado");
  });

  it("não mostra o banner quando o usuário já respondeu", () => {
    localStorage.setItem(CHAVE, "aceito");
    renderizar();
    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
  });

  it("é ocultado na própria página de privacidade", () => {
    renderizar("/privacidade");
    expect(
      screen.queryByRole("region", { name: "Aviso de privacidade" }),
    ).not.toBeInTheDocument();
  });
});
