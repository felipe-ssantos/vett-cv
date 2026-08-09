import { render, screen } from "@testing-library/react";
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

describe("AnaliseList — aviso de histórico cheio", () => {
  it("mostra o aviso quando o usuário atinge o limite salvo", async () => {
    mockCarregar(LIMITE_HISTORICO);
    renderizar();

    // Busca pelo texto (não por role=status) para evitar o spinner de
    // carregamento, que também usa role="status" enquanto a lista carrega.
    const aviso = await screen.findByText(/Você atingiu o limite de/);
    expect(aviso).toHaveTextContent(
      `limite de ${LIMITE_HISTORICO} análises`,
    );
    expect(aviso).toHaveTextContent("exclua as que não precisa mais");
  });

  it("não mostra o aviso quando o histórico está abaixo do limite", async () => {
    mockCarregar(LIMITE_HISTORICO - 1);
    renderizar();

    // Aguarda o carregamento concluir renderizando os itens da lista.
    await screen.findByText("Vaga de Teste 0");
    expect(
      screen.queryByText(/Você atingiu o limite de/),
    ).not.toBeInTheDocument();
  });

  it("não mostra o aviso quando o histórico está vazio", async () => {
    mockCarregar(0);
    renderizar();

    await screen.findByText("Nenhuma análise salva ainda");
    expect(
      screen.queryByText(/Você atingiu o limite de/),
    ).not.toBeInTheDocument();
  });
});
