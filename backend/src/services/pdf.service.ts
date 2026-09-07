import { PDFParse } from "pdf-parse";
import { AppError } from "../errors/AppError";
import { IDadosNFeExtraidos } from "../types/document";
import {
  extrairChaveAcesso,
  extrairCnpjEmitente,
  extrairProdutos,
} from "./pdf.extractors";

export async function parseNFePdf(
  buffer: Buffer,
  nomeArquivo: string
): Promise<IDadosNFeExtraidos> {
  let textoExtraido = "";

  const parser = new PDFParse({ data: buffer });

  try {
    const resultado = await parser.getText();
    textoExtraido = resultado.text ?? "";
  } catch (error) {
    console.error("[PDF] Falha ao extrair texto:", error);
    throw new AppError(
      `PDF inválido ou corrompido em "${nomeArquivo}": não foi possível extrair o conteúdo.`,
      422
    );
  } finally {
    await parser.destroy();
  }

  if (!textoExtraido.trim()) {
    throw new AppError(
      `Não foi possível extrair texto de "${nomeArquivo}". PDFs escaneados exigiriam OCR.`,
      422
    );
  }

  const chaveAcesso = extrairChaveAcesso(textoExtraido);
  if (!chaveAcesso) {
    throw new AppError(
      `Chave de acesso (44 dígitos) não encontrada em "${nomeArquivo}".`,
      422
    );
  }

  const cnpjEmitente = extrairCnpjEmitente(textoExtraido, chaveAcesso);
  if (!cnpjEmitente) {
    throw new AppError(
      `CNPJ do emitente não encontrado em "${nomeArquivo}".`,
      422
    );
  }

  const produtos = extrairProdutos(textoExtraido);
  if (!produtos.length) {
    throw new AppError(
      `Nenhum produto encontrado em "${nomeArquivo}".`,
      422
    );
  }

  return {
    chaveAcesso,
    cnpjEmitente,
    produtos,
  };
}
