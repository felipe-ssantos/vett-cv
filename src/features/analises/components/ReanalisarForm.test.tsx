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

beforeEach(() => {
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

function criarArquivoPdf() {
  return new File(["conteúdo do currículo"], "curriculo.pdf", {
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
