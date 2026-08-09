import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analiseFixture } from "../../../test/fixtures";
import { AnaliseList, LIMITE_HISTORICO } from "./AnaliseList";

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

function criarAnalises(quantidade: number) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    ...analiseFixture,
    id: `analise-${indice}`,
    titulo_vaga: `Vaga de Teste ${indice}`,
  }));
}

function mockCarregar(quantidade: number) {
  supabaseMocks.getUser.mockResolvedValue({
    data: { user: { id: "usuario-teste" } },
  });
  supabaseMocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        order: vi.fn().mockResolvedValue({
          data: criarAnalises(quantidade),
          error: null,
        }),
      }),
    }),
  });
}

function renderizar() {
  return render(
    <MemoryRouter>
      <AnaliseList />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AnaliseList — contador de histórico", () => {
  it("mostra o contador de análises salvas", async () => {
    mockCarregar(5);
    renderizar();

    await screen.findByText("Vaga de Teste 0");
    expect(
      screen.getByText(`5 de ${LIMITE_HISTORICO} análises salvas`),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Análises salvas no histórico" }),
    ).toHaveAttribute("aria-valuenow", "5");
  });

  it("não mostra o contador com o histórico vazio", async () => {
    mockCarregar(0);
    renderizar();

    await screen.findByText("Nenhuma análise salva ainda");
    expect(
      screen.queryByText(/análises salvas/),
    ).not.toBeInTheDocument();
  });
});

describe("AnaliseList — aviso de histórico cheio", () => {
  it("avisa quando o usuário atinge o limite salvo", async () => {
    mockCarregar(LIMITE_HISTORICO);
    renderizar();

    // Busca pelo texto (não por role=status) para evitar o spinner de
    // carregamento, que também usa role="status" enquanto a lista carrega.
    const aviso = await screen.findByText(/Limite atingido/);
    expect(aviso).toHaveTextContent("a mais antiga será removida");
  });

  it("indica quantas análises restam abaixo do limite", async () => {
    mockCarregar(LIMITE_HISTORICO - 1);
    renderizar();

    await screen.findByText("Vaga de Teste 0");
    expect(
      screen.getByText(/ainda pode salvar 1 análise/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Limite atingido/),
    ).not.toBeInTheDocument();
  });

  it("não mostra o aviso quando o histórico está vazio", async () => {
    mockCarregar(0);
    renderizar();

    await screen.findByText("Nenhuma análise salva ainda");
    expect(
      screen.queryByText(/Limite atingido/),
    ).not.toBeInTheDocument();
  });
});

describe("AnaliseList — exportar histórico", () => {
  it("baixa um arquivo JSON com as análises ao clicar em Exportar", async () => {
    const user = userEvent.setup();
    mockCarregar(2);
    renderizar();

    await screen.findByText("Vaga de Teste 0");
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:teste");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    await user.click(screen.getByRole("button", { name: /Exportar/ }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalled());

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });

  it("não oferece exportar com o histórico vazio", async () => {
    mockCarregar(0);
    renderizar();

    await screen.findByText("Nenhuma análise salva ainda");
    expect(
      screen.queryByRole("button", { name: /Exportar/ }),
    ).not.toBeInTheDocument();
  });
});
