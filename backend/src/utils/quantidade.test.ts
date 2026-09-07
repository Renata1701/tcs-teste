import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../errors/AppError";
import { parseQuantidadeObrigatoria } from "./quantidade";

describe("parseQuantidadeObrigatoria", () => {
  it("aceita quantidade válida com ponto", () => {
    assert.equal(parseQuantidadeObrigatoria("27.500", "item 1"), 27.5);
  });

  it("aceita quantidade válida com vírgula", () => {
    assert.equal(parseQuantidadeObrigatoria("18,250", "item 2"), 18.25);
  });

  it("aceita valor vindo em array no estilo xml2js", () => {
    assert.equal(parseQuantidadeObrigatoria(["10"], "item 3"), 10);
  });

  it("rejeita quantidade ausente", () => {
    assert.throws(
      () => parseQuantidadeObrigatoria("", "item 1"),
      (error: unknown) =>
        error instanceof AppError && error.message.includes("ausente")
    );
  });

  it("rejeita quantidade zero", () => {
    assert.throws(
      () => parseQuantidadeObrigatoria("0", "item 1"),
      (error: unknown) =>
        error instanceof AppError && error.message.includes("inválida")
    );
  });

  it("rejeita quantidade negativa", () => {
    assert.throws(
      () => parseQuantidadeObrigatoria("-2", "item 1"),
      (error: unknown) =>
        error instanceof AppError && error.message.includes("inválida")
    );
  });

  it("rejeita texto não numérico", () => {
    assert.throws(
      () => parseQuantidadeObrigatoria("abc", "item 1"),
      (error: unknown) =>
        error instanceof AppError && error.message.includes("inválida")
    );
  });
});
