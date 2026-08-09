// @vitest-environment node
// Função pura (só strings) — ambiente node evita o jsdom desnecessário.
import { describe, expect, it } from "vitest";
import {
  LIMITE_CARACTERES_TEXTO,
  campoExcedeLimiteDeTexto,
} from "./limitesTexto.js";

describe("campoExcedeLimiteDeTexto — teto de 8.000 caracteres (P3)", () => {
  it("aceita campos dentro do limite", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: "a".repeat(5000) },
      { nome: "curriculoTexto", valor: "b".repeat(8000) },
    ]);

    expect(resultado).toBeNull();
  });

  it("aceita exatamente o teto (8000) como válido", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: "x".repeat(8000) },
    ]);

    expect(resultado).toBeNull();
  });

  it("rejeita o primeiro campo que excede o teto", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: "a".repeat(8001) },
      { nome: "curriculoTexto", valor: "b".repeat(9000) },
    ]);

    expect(resultado).toBe("descricaoVaga");
  });

  it("rejeita curriculoTexto quando é o excedente", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: "ok" },
      { nome: "curriculoTexto", valor: "b".repeat(8001) },
    ]);

    expect(resultado).toBe("curriculoTexto");
  });

  it("rejeita vagaExistente (JSON de reanálise) quando excede", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: "ok" },
      { nome: "curriculoTexto", valor: "ok" },
      { nome: "vagaExistente", valor: JSON.stringify({ x: "y".repeat(8001) }) },
    ]);

    expect(resultado).toBe("vagaExistente");
  });

  it("ignora campos ausentes (undefined)", () => {
    const resultado = campoExcedeLimiteDeTexto([
      { nome: "descricaoVaga", valor: undefined },
      { nome: "curriculoTexto", valor: "ok" },
    ]);

    expect(resultado).toBeNull();
  });

  it("expõe o mesmo teto usado no client (8000)", () => {
    expect(LIMITE_CARACTERES_TEXTO).toBe(8000);
  });

  it("aceita limite customizado", () => {
    const resultado = campoExcedeLimiteDeTexto(
      [{ nome: "descricaoVaga", valor: "a".repeat(101) }],
      100,
    );
    expect(resultado).toBe("descricaoVaga");
  });
});
