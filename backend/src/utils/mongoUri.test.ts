import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mascararMongoUri } from "./mongoUri";

describe("mascararMongoUri", () => {
  it("oculta usuário e senha da URI", () => {
    const mascarada = mascararMongoUri(
      "mongodb://admin:segredo@127.0.0.1:27017/tcs_documentos"
    );
    assert.equal(
      mascarada,
      "mongodb://***:***@127.0.0.1:27017/tcs_documentos"
    );
  });

  it("mantém URI local sem credenciais", () => {
    const uri = "mongodb://127.0.0.1:27017/tcs_documentos";
    assert.equal(mascararMongoUri(uri), uri);
  });
});
