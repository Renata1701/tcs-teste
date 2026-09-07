import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { consolidarStatus, resultadosDoArquivo } from "./resultados";

describe("resultadosDoArquivo", () => {
  it("associa entradas internas de ZIP ao arquivo original", () => {
    const relacionados = resultadosDoArquivo("documentos-validos.zip", [
      { arquivo: "documentos-validos.zip » nfe1.xml" },
      { arquivo: "documentos-validos.zip » nfe2.pdf" },
      { arquivo: "outro.zip » nfe.xml" },
    ]);

    assert.equal(relacionados.length, 2);
  });
});

describe("consolidarStatus", () => {
  it("marca ZIP como sucesso quando todos os itens internos são sucesso", () => {
    const consolidado = consolidarStatus([
      { arquivo: "pacote.zip » a.xml", status: "sucesso", mensagem: "ok" },
      { arquivo: "pacote.zip » b.pdf", status: "sucesso", mensagem: "ok" },
    ]);

    assert.equal(consolidado.status, "sucesso");
  });

  it("marca ZIP como parcial quando há sucessos e erros", () => {
    const consolidado = consolidarStatus([
      { arquivo: "pacote.zip » a.xml", status: "sucesso", mensagem: "ok" },
      { arquivo: "pacote.zip » b.txt", status: "erro", mensagem: "formato" },
    ]);

    assert.equal(consolidado.status, "parcial");
  });

  it("retorna erro quando não há retorno para o arquivo", () => {
    const consolidado = consolidarStatus([]);
    assert.equal(consolidado.status, "erro");
  });
});
