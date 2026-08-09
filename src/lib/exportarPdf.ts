// Import dinâmico do jsPDF: a biblioteca é pesada (inclui html2canvas) e só
// deve entrar no bundle quando o usuário realmente exportar o PDF — mantendo o
// chunk da rota de histórico enxuto (code-splitting).
import type { jsPDF } from "jspdf";
import type { Analise } from "../types";

// Rótulos amigáveis para as categorias do score (mesmo mapeamento do app).
const LABELS_CATEGORIA: Record<string, string> = {
  skills_tecnicas: "Competências técnicas",
  ferramentas: "Ferramentas",
  experiencia: "Experiência",
  soft_skills: "Soft skills",
};

const MARGEM = 48;
const COR_TITULO: [number, number, number] = [24, 24, 34];
const COR_TEXTO: [number, number, number] = [60, 60, 70];
const COR_MUTADO: [number, number, number] = [120, 120, 130];
const COR_PRIMARIA: [number, number, number] = [13, 110, 120];
const COR_SEPARADOR: [number, number, number] = [222, 222, 228];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Gera o PDF estruturado do histórico de análises. Função pura (não dispara o
 * download): recebe o documento jsPDF pronto, o que permite testar o conteúdo
 * e reaproveitar a montagem.
 */
export async function montarPdfHistorico(analises: Analise[]): Promise<jsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setProperties({ title: "Vett — Histórico de Análises" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const larguraUtil = larguraPagina - MARGEM * 2;
  const alturaPagina = doc.internal.pageSize.getHeight();
  let y = MARGEM;

  function novaPagina() {
    doc.addPage();
    y = MARGEM;
  }

  function garantirEspaco(altura: number) {
    if (y + altura > alturaPagina - MARGEM) novaPagina();
  }

  function texto(
    conteudo: string,
    tamanho: number,
    cor: [number, number, number],
    estilo: "normal" | "bold" | "italic" = "normal",
  ) {
    doc.setFont("helvetica", estilo);
    doc.setFontSize(tamanho);
    doc.setTextColor(cor[0], cor[1], cor[2]);
    doc.text(conteudo, MARGEM, y);
    y += tamanho * 1.35;
  }

  function paragrafo(
    conteudo: string,
    tamanho: number,
    cor: [number, number, number],
  ) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tamanho);
    doc.setTextColor(cor[0], cor[1], cor[2]);
    const linhas = doc.splitTextToSize(conteudo, larguraUtil);
    for (const linha of linhas) {
      garantirEspaco(tamanho * 1.35);
      doc.text(linha, MARGEM, y);
      y += tamanho * 1.35;
    }
  }

  function listaDe(itens: string[], espacoApos: number) {
    if (itens.length === 0) {
      texto("—", 10, COR_MUTADO);
      y += 2;
      return;
    }
    for (const item of itens) {
      garantirEspaco(16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(COR_TEXTO[0], COR_TEXTO[1], COR_TEXTO[2]);
      doc.text("•", MARGEM + 8, y);
      const linhas = doc.splitTextToSize(item, larguraUtil - 26);
      for (const linha of linhas) {
        doc.text(linha, MARGEM + 20, y);
        y += 15;
      }
    }
    y += espacoApos;
  }

  function secao(tituloSecao: string) {
    garantirEspaco(24);
    y += 4;
    texto(tituloSecao, 11, COR_TITULO, "bold");
  }

  // Cabeçalho do documento.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(COR_TITULO[0], COR_TITULO[1], COR_TITULO[2]);
  doc.text("Vett — Histórico de Análises", MARGEM, y);
  y += 24;
  texto(
    `Gerado em ${new Date().toLocaleString("pt-BR")} · ${analises.length} ${
      analises.length === 1 ? "análise" : "análises"
    }`,
    10,
    COR_MUTADO,
  );
  y += 12;

  analises.forEach((analise, indice) => {
    if (indice > 0) {
      garantirEspaco(120);
      doc.setDrawColor(COR_SEPARADOR[0], COR_SEPARADOR[1], COR_SEPARADOR[2]);
      doc.line(MARGEM, y, MARGEM + larguraUtil, y);
      y += 24;
    }
    garantirEspaco(220);

    // Título da vaga + metadados (empresa · senioridade · data).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(COR_TITULO[0], COR_TITULO[1], COR_TITULO[2]);
    const tituloLinhas = doc.splitTextToSize(analise.titulo_vaga, larguraUtil);
    for (const linha of tituloLinhas) {
      doc.text(linha, MARGEM, y);
      y += 18;
    }
    y += 2;
    const meta = [analise.empresa, analise.senioridade, formatarData(analise.created_at)]
      .filter(Boolean)
      .join(" · ");
    if (meta) texto(meta, 10, COR_MUTADO);
    y += 8;

    // Score geral.
    texto(
      `Score de compatibilidade: ${analise.score_match}/100`,
      12,
      COR_PRIMARIA,
      "bold",
    );
    y += 4;

    // Barras por categoria.
    if (analise.match_por_categoria) {
      for (const [chave, valor] of Object.entries(
        analise.match_por_categoria,
      )) {
        garantirEspaco(20);
        const label = LABELS_CATEGORIA[chave] ?? chave;
        texto(`${label}: ${valor}/100`, 10, COR_TEXTO);
        const baseX = MARGEM + larguraUtil * 0.42;
        const larguraBarra = larguraUtil * 0.5;
        const topoBarra = y - 8;
        doc.setFillColor(232, 236, 240);
        doc.roundedRect(baseX, topoBarra, larguraBarra, 6, 2, 2, "F");
        doc.setFillColor(COR_PRIMARIA[0], COR_PRIMARIA[1], COR_PRIMARIA[2]);
        doc.roundedRect(
          baseX,
          topoBarra,
          Math.max(2, larguraBarra * Math.min(1, valor / 100)),
          6,
          2,
          2,
          "F",
        );
        y -= 2;
      }
      y += 6;
    }

    // Blocos de conteúdo estruturado.
    secao("Palavras-chave presentes");
    listaDe(analise.keywords_presentes, 4);
    secao("Palavras-chave faltando");
    listaDe(analise.keywords_faltando, 4);
    secao("Pontos fortes");
    listaDe(analise.pontos_fortes, 4);
    secao("Sugestões de ajuste");
    listaDe(analise.sugestoes_ajuste, 4);
    secao("Resumo da IA");
    paragrafo(analise.resumo_ia, 10, COR_TEXTO);
    y += 4;
    if (analise.dica_final) {
      secao("Insight");
      paragrafo(analise.dica_final, 10, COR_TEXTO);
      y += 4;
    }
    secao("Descrição da vaga");
    paragrafo(analise.descricao_vaga, 10, COR_TEXTO);
    y += 14;
  });

  return doc;
}

/**
 * Exporta o histórico completo como PDF (arquivo .pdf datado), substituindo o
 * antigo JSON — dados estruturados e legíveis para qualquer pessoa.
 */
export async function exportarHistoricoPdf(analises: Analise[]) {
  const doc = await montarPdfHistorico(analises);
  const nome = `vett-historico-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(nome);
}
