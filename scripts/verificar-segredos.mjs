/**
 * Verifica se há chaves/segredos vazados no repositório.
 *
 * Varre os arquivos do projeto (rastreados + novos não rastreados, respeitando
 * o .gitignore via `git ls-files`) procurando padrões de chaves REAIS: JWTs,
 * chaves do Supabase (sb_publishable_/sb_secret_), chaves da Google (AIza),
 * tokens de serviços (sk-, ghp_, xoxb-, AKIA), chaves privadas e arquivos
 * `.env` versionados por engano (fora do template).
 *
 * O template `.env.local.example` é ignorado: contém apenas nomes de
 * variáveis com valores vazios, sem segredo algum.
 *
 * Uso: `npm run check:secrets` (também executado no CI a cada push/PR).
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

// Padrões de chaves com valor preenchido (não placeholders).
// Exportado para os testes unitários (scripts/verificar-segredos.test.mjs).
export const PADROES = [
  {
    nome: "JWT (Supabase ou outro emissor)",
    regex: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  },
  {
    nome: "Chave publicável do Supabase (sb_publishable_)",
    regex: /sb_publishable_[A-Za-z0-9_]{10,}/,
  },
  {
    nome: "Chave secreta do Supabase (sb_secret_)",
    regex: /sb_secret_[A-Za-z0-9_]{10,}/,
  },
  {
    nome: "Chave da Google (AIza...) — Gemini/Cloud",
    regex: /AIza[0-9A-Za-z_-]{35}/,
  },
  {
    nome: "Token OpenAI (sk-)",
    regex: /sk-[A-Za-z0-9-]{20,}/,
  },
  {
    nome: "Token GitHub (ghp_)",
    regex: /ghp_[A-Za-z0-9]{30,}/,
  },
  {
    nome: "Token Slack (xoxb-/xoxp-...)",
    regex: /xox[baprs]-[A-Za-z0-9-]{20,}/,
  },
  {
    nome: "Chave AWS (AKIA)",
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    nome: "Chave privada (RSA/EC/OpenSSH/PGP/ENCRYPTED)",
    regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/,
  },
];

// Nome do template versionado de propósito (valores vazios, sem segredos).
const TEMPLATE_ENV = ".env.local.example";

/**
 * Varre um conteúdo de texto e devolve os segredos detectados.
 * Função pura — usada pelo CLI e pelos testes unitários.
 */
export function detectarSegredosEmTexto(conteudo) {
  const achados = [];
  for (const { nome, regex } of PADROES) {
    const match = conteudo.match(regex);
    if (match) {
      achados.push({ nome, trecho: match[0] });
    }
  }
  return achados;
}

function listarArquivos() {
  // -c: rastreados | -o: não rastreados (não ignorados) | --exclude-standard:
  // respeita o .gitignore. O CI roda após checkout, então cobre o push inteiro.
  const saida = execFileSync(
    "git",
    ["ls-files", "-co", "--exclude-standard", "-z"],
    { encoding: "utf8" },
  );
  return saida
    .split("\0")
    .filter(Boolean)
    .filter((arquivo) => !arquivo.includes(TEMPLATE_ENV));
}

export async function verificar() {
  const arquivos = listarArquivos();
  let problemas = 0;

  for (const arquivo of arquivos) {
    // Falhas de leitura (ex.: arquivo indisponível) são puladas.
    let conteudo;
    try {
      conteudo = await readFile(arquivo, "utf8");
    } catch {
      continue;
    }

    for (const achado of detectarSegredosEmTexto(conteudo)) {
      problemas += 1;
      // Nunca imprime o segredo — só o arquivo e o tipo.
      console.error(
        `  ✘ ${arquivo}: possível ${achado.nome} detectado (match "${maskMatch(achado.trecho)}")`,
      );
    }
  }

  console.log("");
  if (problemas > 0) {
    console.error(
      `✘ ${problemas} possível(eis) segredo(s) vazado(s). Remova a(s) chave(s) antes de commitar/pushar.`,
    );
    process.exit(1);
  }
  console.log(`✔ Nenhum segredo detectado em ${arquivos.length} arquivo(s).`);
}

/** Exibe apenas o começo do trecho encontrado, mascarando o resto. */
function maskMatch(trecho) {
  return trecho.length > 12
    ? `${trecho.slice(0, 6)}...${trecho.slice(-4)} (${trecho.length} chars)`
    : "trecho curto";
}

// Só executa a varredura quando chamado como script (node scripts/verificar-segredos.mjs),
// nunca quando importado pelos testes. `pathToFileURL(process.argv[1])` resolve o
// caminho como digitado (relativo ou absoluto) para uma file URL comparável.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await verificar();
}
