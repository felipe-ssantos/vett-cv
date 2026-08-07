// Estes helpers testam a API moderna e, na escrita, caem para o fallback clássico com document.execCommand.

async function tentarLerComFallback(): Promise<string> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    return navigator.clipboard.readText();
  }
  throw new Error("Área de transferência indisponível.");
}

export async function lerTextoDaAreaDeTransferencia(): Promise<string> {
  try {
    return await tentarLerComFallback();
  } catch {
    // Alguns navegadores rejeitam readText() sem permissão (NotAllowedError).
    // Sem API de leitura síncrona confiável, o usuário e orientado a usar Ctrl+V.
    throw new Error(
      "Para colar, use o atalho Ctrl + V diretamente na caixa de texto.",
    );
  }
}

async function tentarEscreverComFallback(texto: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const copiado = document.execCommand("copy");
  document.body.removeChild(area);
  if (!copiado) {
    throw new Error("Falha ao copiar.");
  }
}

export async function escreverTextoNaAreaDeTransferencia(
  texto: string,
): Promise<void> {
  try {
    await tentarEscreverComFallback(texto);
  } catch {
    // Não lançado para fora: a cópia é um extra de conveniência na UI.
    console.error("Falha ao copiar para a área de transferência.");
  }
}
