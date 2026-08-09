import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analiseFixture } from "../../../test/fixtures";
import type { Analise } from "../../../types";
import { AnaliseList, LIMITE_HISTORICO } from "./AnaliseList";

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

const exportarPdfMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/exportarPdf", () => ({
  exportarHistoricoPdf: exportarPdfMock,
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
  exportarPdfMock.mockReset();
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

describe("AnaliseList — aviso e meter de histórico cheio", () => {
  it("avisa e enche a barra quando o usuário atinge o limite salvo", async () => {
    mockCarregar(LIMITE_HISTORICO);
    renderizar();

    // Busca pelo texto (não por role=status) para evitar o spinner de
    // carregamento, que também usa role="status" enquanto a lista carrega.
    const aviso = await screen.findByText(/Limite atingido/);
    expect(aviso).toHaveTextContent("a mais antiga será removida");

    // Meter cheio: barra em 100% e valor máximo no ARIA.
    const barra = screen.getByRole("progressbar", {
      name: "Análises salvas no histórico",
    });
    expect(barra).toHaveAttribute("aria-valuenow", String(LIMITE_HISTORICO));
    expect(barra.firstElementChild).toHaveStyle({ width: "100%" });
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

describe("AnaliseList — exportar histórico em PDF", () => {
  it("gera um PDF com todas as análises ao clicar em Exportar PDF", async () => {
    const user = userEvent.setup();
    mockCarregar(2);
    renderizar();

    await screen.findByText("Vaga de Teste 0");
    await user.click(screen.getByRole("button", { name: /Exportar PDF/ }));

    expect(exportarPdfMock).toHaveBeenCalledTimes(1);
    const analisesExportadas = exportarPdfMock.mock.calls[0][0] as Analise[];
    expect(analisesExportadas).toHaveLength(2);
    expect(analisesExportadas[0].titulo_vaga).toBe("Vaga de Teste 0");
  });

  it("não oferece exportar com o histórico vazio", async () => {
    mockCarregar(0);
    renderizar();

    await screen.findByText("Nenhuma análise salva ainda");
    expect(
      screen.queryByRole("button", { name: /Exportar PDF/ }),
    ).not.toBeInTheDocument();
  });
});
