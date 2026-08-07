import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AnaliseWorkspace } from "./AnaliseWorkspace";

vi.mock("../../../lib/supabaseClient", () => ({
  supabase: {},
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
