/**
 * Valida a sintaxe de todas as migrations em `supabase/migrations/`.
 *
 * Usa `pgsql-parser` (libpg_query compilado para WebAssembly) — o mesmo parser
 * do PostgreSQL — sem precisar de banco nem de compilação nativa. Isso pega
 * erros de sintaxe como o dollar-quoting aninhado (`$$` dentro de `do $$`) que
 * quebraria o SQL Editor do Supabase.
 *
 * Uso: `npm run check:migrations`
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadModule, parse } from "pgsql-parser";

const DIR_MIGRATIONS = join(process.cwd(), "supabase", "migrations");

await loadModule();

const arquivos = (await readdir(DIR_MIGRATIONS))
  .filter((f) => f.endsWith(".sql"))
  .sort();

let falhas = 0;

for (const arquivo of arquivos) {
  const sql = await readFile(join(DIR_MIGRATIONS, arquivo), "utf8");
  try {
    await parse(sql);
    console.log(`  ✔ ${arquivo}`);
  } catch (erro) {
    falhas += 1;
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error(`  ✘ ${arquivo}`);
    console.error(`      ${mensagem.split("\n").slice(0, 3).join("\n      ")}`);
  }
}

console.log("");
if (falhas > 0) {
  console.error(
    `✘ ${falhas} migration(s) com erro de sintaxe. Corrija antes de aplicar no Supabase.`,
  );
  process.exit(1);
}
console.log(`✔ ${arquivos.length} migration(s) com sintaxe válida.`);
