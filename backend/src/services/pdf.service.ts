import { PDFParse } from "pdf-parse";
import { AppError } from "../errors/AppError";
import {
  IDadosNFeExtraidos,
  IProdutoExtraido,
} from "../types/document";

const REGEX_CNPJ =
  /\b(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/;

const REGEX_PRODUTO_LINHA =
  /PRODUTO:\s*CODIGO\s*=\s*([^;]+);\s*DESCRICAO\s*=\s*([^;]+);\s*QUANTIDADE\s*=\s*([\d.,]+)/gi;

function extrairChaveAcesso(texto: string): string | null {
  const candidatos =
    texto.match(/\d[\d.\s]{40,90}\d/g) ?? [];

  for (const candidato of candidatos) {
    const digitos =
      candidato.replace(/\D/g, "");

    if (digitos.length === 44) {
      return digitos;
    }
  }

  const direto =
    texto.match(/\b\d{44}\b/);

  return direto
    ? direto[0]
    : null;
}

function extrairCnpj(
  texto: string
): string | null {
  const match =
    texto.match(REGEX_CNPJ);

  if (!match) {
    return null;
  }

  return match[1].replace(
    /\D/g,
    ""
  );
}

function extrairProdutos(
  texto: string
): IProdutoExtraido[] {
  const produtos:
    IProdutoExtraido[] = [];

  let match:
    RegExpExecArray | null;

  REGEX_PRODUTO_LINHA.lastIndex = 0;

  while (
    (match =
      REGEX_PRODUTO_LINHA.exec(
        texto
      )) !== null
  ) {
    const codigo =
      match[1].trim();

    const descricao =
      match[2].trim();

    const quantidade =
      parseFloat(
        match[3].replace(
          ",",
          "."
        )
      );

    produtos.push({
      codigo,
      descricao,
      quantidade:
        Number.isNaN(
          quantidade
        )
          ? 0
          : quantidade,
    });
  }

  return produtos;
}

export async function parseNFePdf(
  buffer: Buffer,
  nomeArquivo: string
): Promise<IDadosNFeExtraidos> {
  let textoExtraido = "";

  const parser =
    new PDFParse({
      data: buffer,
    });

  try {
    const resultado =
      await parser.getText();

    textoExtraido =
      resultado.text ?? "";
  } catch (error) {
    console.error(
      "[PDF] Erro real:",
      error
    );

    throw new AppError(
      `PDF inválido ou corrompido em "${nomeArquivo}": não foi possível extrair o conteúdo.`,
      422
    );
  } finally {
    await parser.destroy();
  }

  if (
    !textoExtraido.trim()
  ) {
    throw new AppError(
      `Não foi possível extrair texto de "${nomeArquivo}". PDFs escaneados exigiriam OCR.`,
      422
    );
  }

  const chaveAcesso =
    extrairChaveAcesso(
      textoExtraido
    );

  if (!chaveAcesso) {
    throw new AppError(
      `Chave de acesso (44 dígitos) não encontrada em "${nomeArquivo}".`,
      422
    );
  }

  const cnpjEmitente =
    extrairCnpj(
      textoExtraido
    );

  if (!cnpjEmitente) {
    throw new AppError(
      `CNPJ do emitente não encontrado em "${nomeArquivo}".`,
      422
    );
  }

  const produtos =
    extrairProdutos(
      textoExtraido
    );

  if (
    !produtos.length
  ) {
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