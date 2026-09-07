import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cnpjDaChaveAcesso,
  extrairChaveAcesso,
  extrairCnpjEmitente,
  extrairProdutos,
} from "./pdf.extractors";

const CHAVE = "35240512345678000190550010000000021000000027";

describe("cnpjDaChaveAcesso", () => {
  it("extrai o CNPJ do emitente dos dígitos 7 a 20 da chave", () => {
    assert.equal(cnpjDaChaveAcesso(CHAVE), "12345678000190");
  });
});

describe("extrairCnpjEmitente", () => {
  it("usa o CNPJ da chave mesmo quando outro CNPJ aparece primeiro", () => {
    const texto = `
      DESTINATARIO
      CNPJ: 98.765.432/0001-10
      EMITENTE
      CNPJ: 12.345.678/0001-90
    `;
    assert.equal(extrairCnpjEmitente(texto, CHAVE), "12345678000190");
  });

  it("lê o rótulo CNPJ DO EMITENTE", () => {
    const texto = "CNPJ DO EMITENTE: 12.345.678/0001-90";
    assert.equal(extrairCnpjEmitente(texto, null), "12345678000190");
  });

  it("lê o CNPJ na seção EMITENTE antes de DESTINATARIO", () => {
    const texto = `
      EMITENTE
      CNPJ: 12.345.678/0001-90
      MINERADORA SARZEDO LTDA
      DESTINATARIO
      CNPJ: 98.765.432/0001-10
    `;
    assert.equal(extrairCnpjEmitente(texto, null), "12345678000190");
  });
});

describe("extrairChaveAcesso", () => {
  it("junta chave quebrada por espaço", () => {
    const texto = "CHAVE DE ACESSO: 3524051234567800019055001000000002 1000000027";
    assert.equal(extrairChaveAcesso(texto), CHAVE);
  });
});

describe("extrairProdutos", () => {
  it("lê o formato de teste do projeto", () => {
    const texto = `
      PRODUTO: CODIGO=MIN001; DESCRICAO=MINERIO DE FERRO; QUANTIDADE=32.5
      PRODUTO: CODIGO=MIN003; DESCRICAO=MINERIO DE FERRO - PELOTAS; QUANTIDADE=41.0
    `;
    const produtos = extrairProdutos(texto);
    assert.equal(produtos.length, 2);
    assert.equal(produtos[0].codigo, "MIN001");
    assert.equal(produtos[0].quantidade, 32.5);
    assert.equal(produtos[1].codigo, "MIN003");
  });

  it("lê linha rotulada de DANFE", () => {
    const texto =
      "CODIGO: MIN001 DESCRICAO: MINERIO DE FERRO GRANULADO QUANTIDADE: 27,500";
    const produtos = extrairProdutos(texto);
    assert.equal(produtos.length, 1);
    assert.equal(produtos[0].codigo, "MIN001");
    assert.equal(produtos[0].quantidade, 27.5);
  });

  it("lê linha tabular típica de DANFE", () => {
    const texto =
      "MIN001 MINERIO DE FERRO - GRANULADO 26011100 000 5101 TON 27,500 100,00 2750,00";
    const produtos = extrairProdutos(texto);
    assert.equal(produtos.length, 1);
    assert.equal(produtos[0].codigo, "MIN001");
    assert.equal(produtos[0].descricao, "MINERIO DE FERRO - GRANULADO");
    assert.equal(produtos[0].quantidade, 27.5);
  });

  it("rejeita quantidade inválida no formato de teste", () => {
    assert.throws(
      () =>
        extrairProdutos(
          "PRODUTO: CODIGO=MIN001; DESCRICAO=MINERIO; QUANTIDADE=0"
        ),
      /inválida/
    );
  });
});
