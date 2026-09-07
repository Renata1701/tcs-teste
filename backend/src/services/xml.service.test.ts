import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNFeXml } from "./xml.service";

function xmlBase(qCom: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35240512345678000190550010000000011000000010" versao="4.00">
      <emit><CNPJ>12345678000190</CNPJ></emit>
      <det nItem="1">
        <prod>
          <cProd>MIN001</cProd>
          <xProd>MINERIO</xProd>
          <qCom>${qCom}</qCom>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>`;
}

describe("parseNFeXml", () => {
  it("extrai quantidade válida", async () => {
    const dados = await parseNFeXml(Buffer.from(xmlBase("27.500")), "ok.xml");
    assert.equal(dados.produtos[0].quantidade, 27.5);
    assert.equal(dados.chaveAcesso, "35240512345678000190550010000000011000000010");
  });

  it("rejeita quantidade ausente", async () => {
    await assert.rejects(
      () => parseNFeXml(Buffer.from(xmlBase("")), "sem-qtd.xml"),
      /Quantidade do produto ausente/
    );
  });

  it("rejeita quantidade zero", async () => {
    await assert.rejects(
      () => parseNFeXml(Buffer.from(xmlBase("0")), "zero.xml"),
      /Quantidade do produto inválida/
    );
  });
});
