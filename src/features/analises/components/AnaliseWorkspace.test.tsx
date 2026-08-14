import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnaliseWorkspace } from "./AnaliseWorkspace";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {},
}));

const cotaMock = vi.hoisted(() => ({
  valor: null as {
    sessao: { restante: number } | null;
    global: { restante: number } | null;
    renovaEm: string | null;
    renovaEmGlobal: string | null;
  } | null,
}));

const enviarAnaliseMock = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/analisarApi", () => ({
  enviarAnalise: enviarAnaliseMock,
}));

vi.mock("../hooks/useCotaAnalises", () => ({
  useCotaAnalises: () => ({
    cota: cotaMock.valor,
    carregando: false,
    atualizarCota: vi.fn(),
  }),
}));

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

beforeEach(() => {
  cotaMock.valor = null;
  enviarAnaliseMock.mockReset();
});

function renderizarWorkspace() {
  return render(
    <MemoryRouter>
      <AnaliseWorkspace />
    </MemoryRouter>,
  );
}

function selecionarArquivo() {
  const input = screen.getByLabelText("Ou envie o arquivo do currículo");
  fireEvent.change(input, { target: { files: [criarArquivoPdf()] } });
  return input;
}

describe("AnaliseWorkspace — remoção do arquivo", () => {
  it("mostra o arquivo selecionado e o remove com o atalho Esc", () => {
    renderizarWorkspace();
    const input = selecionarArquivo();

    expect(
      screen.getByText(/Selecionado: curriculo\.pdf/),
    ).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(
      screen.queryByText(/Selecionado: curriculo\.pdf/),
    ).not.toBeInTheDocument();
  });

  it("remove o arquivo ao clicar em Remover e devolve o foco ao campo de arquivo", () => {
    renderizarWorkspace();
    selecionarArquivo();

    const botaoRemover = screen.getByRole("button", {
      name: "Remover arquivo selecionado",
    });
    fireEvent.click(botaoRemover);

    expect(
      screen.queryByText(/Selecionado: curriculo\.pdf/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Ou envie o arquivo do currículo"),
    ).toHaveFocus();
  });

  it("não remove o arquivo quando outra tecla é pressionada", () => {
    renderizarWorkspace();
    const input = selecionarArquivo();

    fireEvent.keyDown(input, { key: "Enter" });

    expect(
      screen.getByText(/Selecionado: curriculo\.pdf/),
    ).toBeInTheDocument();
  });
});

describe("AnaliseWorkspace — bloqueio por cota", () => {
  it("embaça o painel de resultado e mostra o overlay de bloqueio quando a cota da sessão esgota", () => {
    cotaMock.valor = {
      sessao: { restante: 0 },
      global: { restante: 90 },
      renovaEm: null,
      renovaEmGlobal: null,
    };
    renderizarWorkspace();

    // O conteúdo embaçado (análise anterior ou estado vazio) fica oculto de
    // leitores de tela (aria-hidden) e o overlay de bloqueio é o foco.
    expect(
      screen.getByTestId("analise-embacada"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cota de análises esgotada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ver meu histórico" }),
    ).toBeInTheDocument();
  });

  it("embaça o painel quando a cota global esgota e mostra a renovação da meia-noite UTC", () => {
    cotaMock.valor = {
      sessao: { restante: 3 },
      global: { restante: 0 },
      renovaEm: null,
      renovaEmGlobal: "2026-08-10T00:00:00.000Z",
    };
    renderizarWorkspace();

    expect(
      screen.getByTestId("analise-embacada"),
    ).toBeInTheDocument();
    // O texto acompanha o limite que esgotou: o teto global renova à
    // meia-noite UTC, não na janela de 3h.
    expect(
      screen.getByText(/até a cota global do dia renovar/),
    ).toBeInTheDocument();
  });

  it("mostra o painel normal quando a cota ainda tem análises", () => {
    cotaMock.valor = {
      sessao: { restante: 3 },
      global: { restante: 90 },
      renovaEm: null,
      renovaEmGlobal: null,
    };
    renderizarWorkspace();

    expect(
      screen.queryByTestId("analise-embacada"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sua análise aparecerá aqui" }),
    ).toBeInTheDocument();
  });

  it("embaça o painel quando a API responde 429 com a mensagem de limite", async () => {
    // Mensagem da API (janela de 3h) — o cliente a exibe no estado de erro e
    // o workspace reconhece como bloqueio de cota.
    enviarAnaliseMock.mockRejectedValue(
      new Error(
        "Você atingiu o limite de 5 análises por janela de 3 horas neste navegador. A cota renova automaticamente.",
      ),
    );
    cotaMock.valor = {
      sessao: { restante: 2 },
      global: { restante: 90 },
      renovaEm: null,
      renovaEmGlobal: null,
    };
    renderizarWorkspace();

    fireEvent.change(screen.getByLabelText("Currículo"), {
      target: { value: "Analista com SQL e Python" },
    });
    fireEvent.change(screen.getByLabelText("Descrição da vaga"), {
      target: { value: "Vaga de analista de dados" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Analisar oportunidade/ }),
    );

    expect(await screen.findByTestId("analise-embacada")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cota de análises esgotada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Você atingiu o limite de 5 análises por janela/),
    ).toBeInTheDocument();
  });
});

describe("AnaliseWorkspace — validação de tamanho do arquivo", () => {
  it("rejeita arquivo acima de 4 MB com mensagem de erro", () => {
    renderizarWorkspace();
    const input = screen.getByLabelText("Ou envie o arquivo do currículo");

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

  it("aceita arquivo exatamente no limite de 4 MB", () => {
    renderizarWorkspace();
    const input = screen.getByLabelText("Ou envie o arquivo do currículo");

    fireEvent.change(input, {
      target: { files: [criarArquivoDeTamanho(TAMANHO_MAXIMO)] },
    });

    expect(screen.getByText(/Selecionado: arquivo\.pdf/)).toBeInTheDocument();
    expect(
      screen.queryByText(/O arquivo excede o limite/),
    ).not.toBeInTheDocument();
  });

  it("limpa a mensagem de erro ao escolher um arquivo válido depois", () => {
    renderizarWorkspace();
    const input = screen.getByLabelText("Ou envie o arquivo do currículo");

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
