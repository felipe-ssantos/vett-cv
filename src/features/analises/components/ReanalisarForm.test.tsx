import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { analiseFixture } from "../../../test/fixtures";
import { ReanalisarForm } from "./ReanalisarForm";

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: { from: supabaseMocks.from },
}));

const cotaMock = vi.hoisted(() => ({
  valor: null as {
    sessao: { usado: number; limite: number; restante: number } | null;
    global: { usado: number; limite: number; restante: number } | null;
    renovaEm: string | null;
    renovaEmGlobal: string | null;
  } | null,
}));

vi.mock("../hooks/useCotaAnalises", () => ({
  useCotaAnalises: () => ({
    cota: cotaMock.valor,
    carregando: false,
    atualizarCota: vi.fn(),
  }),
}));

beforeEach(() => {
  cotaMock.valor = null;
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

const TAMANHO_MAXIMO = 4 * 1024 * 1024; // 4 MB

function criarArquivoPdf() {
  return new File(["conteúdo do currículo"], "curriculo.pdf", {
    type: "application/pdf",
  });
}

function criarArquivoDeTamanho(bytes: number) {
  return new File(["x".repeat(bytes)], "arquivo.pdf", {
    type: "application/pdf",
  });
}

function renderizarFormulario() {
  return render(
    <MemoryRouter initialEntries={["/analises/analise-1/reanalisar"]}>
      <Routes>
        <Route
          path="/analises/:id/reanalisar"
          element={<ReanalisarForm />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

async function selecionarArquivo() {
  const input = await screen.findByLabelText("Envie o arquivo do currículo");
  fireEvent.change(input, { target: { files: [criarArquivoPdf()] } });
  return input;
}

describe("ReanalisarForm — remoção do arquivo", () => {
  it("mostra o arquivo selecionado e o remove com o atalho Esc", async () => {
    renderizarFormulario();
    const input = await selecionarArquivo();

    expect(
      screen.getByText(/Selecionado: curriculo\.pdf/),
    ).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByText(/Selecionado: curriculo\.pdf/),
    ).not.toBeInTheDocument();
  });

  it("remove o arquivo ao clicar em Remover e devolve o foco ao campo de arquivo", async () => {
    renderizarFormulario();
    await selecionarArquivo();

    const botaoRemover = await screen.findByRole("button", {
      name: "Remover arquivo selecionado",
    });
    fireEvent.click(botaoRemover);

    expect(
      screen.queryByText(/Selecionado: curriculo\.pdf/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Envie o arquivo do currículo"),
    ).toHaveFocus();
  });

  it("não remove o arquivo quando outra tecla é pressionada", async () => {
    renderizarFormulario();
    const input = await selecionarArquivo();

    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByText(/Selecionado: curriculo\.pdf/),
    ).toBeInTheDocument();
  });
});

describe("ReanalisarForm — cota de análises", () => {
  it("mostra o indicador de cota com as análises restantes", async () => {
    cotaMock.valor = {
      sessao: { usado: 2, limite: 5, restante: 3 },
      global: { usado: 10, limite: 100, restante: 90 },
      renovaEm: null,
      renovaEmGlobal: null,
    };
    renderizarFormulario();

    expect(
      await screen.findByText(/3 de 5 análises disponíveis/),
    ).toBeInTheDocument();
  });

  it("mostra o bloqueio de cota quando a sessão esgota", async () => {
    cotaMock.valor = {
      sessao: { usado: 5, limite: 5, restante: 0 },
      global: { usado: 10, limite: 100, restante: 90 },
      renovaEm: null,
      renovaEmGlobal: null,
    };
    renderizarFormulario();

    expect(
      await screen.findByText(/Limite de análises atingido/),
    ).toBeInTheDocument();
  });
});

describe("ReanalisarForm — validação de tamanho do arquivo", () => {
  it("rejeita arquivo acima de 4 MB com mensagem de erro", async () => {
    renderizarFormulario();
    const input = await screen.findByLabelText(
      "Envie o arquivo do currículo",
    );

    fireEvent.change(input, {
      target: { files: [criarArquivoDeTamanho(TAMANHO_MAXIMO + 1)] },
    });

    expect(
      screen.getByText(
        "O arquivo excede o limite de 4 MB. Envie um arquivo menor.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Selecionado:/)).not.toBeInTheDocument();
  });

  it("aceita arquivo exatamente no limite de 4 MB", async () => {
    renderizarFormulario();
    const input = await screen.findByLabelText(
      "Envie o arquivo do currículo",
    );

    fireEvent.change(input, {
      target: { files: [criarArquivoDeTamanho(TAMANHO_MAXIMO)] },
    });

    expect(screen.getByText(/Selecionado: arquivo\.pdf/)).toBeInTheDocument();
    expect(
      screen.queryByText(/O arquivo excede o limite/),
    ).not.toBeInTheDocument();
  });

  it("limpa a mensagem de erro ao escolher um arquivo válido depois", async () => {
    renderizarFormulario();
    const input = await screen.findByLabelText(
      "Envie o arquivo do currículo",
    );

    fireEvent.change(input, {
      target: { files: [criarArquivoDeTamanho(TAMANHO_MAXIMO + 1)] },
    });
    expect(
      screen.getByText(/O arquivo excede o limite/),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { files: [criarArquivoPdf()] } });

    expect(
      screen.queryByText(/O arquivo excede o limite/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Selecionado: curriculo\.pdf/),
    ).toBeInTheDocument();
  });
});
