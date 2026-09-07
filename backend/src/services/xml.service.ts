import { parseStringPromise } from "xml2js";
import { AppError } from "../errors/AppError";
import { IDadosNFeExtraidos, IProdutoExtraido } from "../types/document";
import { parseQuantidadeObrigatoria } from "../utils/quantidade";

/**
 * Extrai o texto de um nó que pode vir como string simples ou como
 * array de string (comportamento padrão do xml2js).
 */
function texto(valor: any): string {
  if (Array.isArray(valor)) return String(valor[0] ?? "").trim();
  return String(valor ?? "").trim();
}

/**
 * Normaliza a chave de acesso, que no atributo Id do infNFe vem
 * geralmente no formato "NFe" + 44 dígitos.
 */
function normalizarChaveAcesso(id: string): string {
  const somenteDigitos = id.replace(/\D/g, "");
  if (somenteDigitos.length < 44) {
    throw new AppError(
      `Chave de acesso inválida no XML (esperado 44 dígitos, encontrado ${somenteDigitos.length}).`,
      422
    );
  }
  // Pega os últimos 44 dígitos (cobre "NFe" + 44 dígitos ou apenas 44 dígitos)
  return somenteDigitos.slice(-44);
}

export async function parseNFeXml(
  buffer: Buffer,
  nomeArquivo: string
): Promise<IDadosNFeExtraidos> {
  let parsed: any;

  try {
    parsed = await parseStringPromise(buffer.toString("utf-8"), {
      explicitArray: true,
      trim: true,
    });
  } catch (error) {
    throw new AppError(
      `XML inválido ou corrompido em "${nomeArquivo}": não foi possível fazer o parse do arquivo.`,
      422
    );
  }

  if (!parsed) {
    throw new AppError(`XML inválido ou corrompido em "${nomeArquivo}".`, 422);
  }

  // Aceita tanto nfeProc > NFe > infNFe quanto NFe > infNFe diretamente
  let nfeNode = parsed.nfeProc?.NFe?.[0] ?? parsed.NFe;

  if (!nfeNode) {
    throw new AppError(
      `Estrutura de XML não reconhecida em "${nomeArquivo}". Esperado "nfeProc/NFe/infNFe" ou "NFe/infNFe".`,
      422
    );
  }

  const infNFe = nfeNode.infNFe?.[0];

  if (!infNFe) {
    throw new AppError(
      `Tag "infNFe" não encontrada em "${nomeArquivo}".`,
      422
    );
  }

  const idAttr: string | undefined = infNFe.$?.Id;
  if (!idAttr) {
    throw new AppError(
      `Atributo "Id" (chave de acesso) não encontrado em "${nomeArquivo}".`,
      422
    );
  }
  const chaveAcesso = normalizarChaveAcesso(idAttr);

  const emit = infNFe.emit?.[0];
  const cnpjEmitente = texto(emit?.CNPJ);
  if (!cnpjEmitente) {
    throw new AppError(
      `CNPJ do emitente não encontrado em "${nomeArquivo}".`,
      422
    );
  }

  const detList: any[] = infNFe.det ?? [];
  if (!detList.length) {
    throw new AppError(
      `Nenhum produto (tag "det") encontrado em "${nomeArquivo}".`,
      422
    );
  }

  const produtos: IProdutoExtraido[] = detList.map((det, index) => {
    const prod = det.prod?.[0];
    if (!prod) {
      throw new AppError(
        `Produto inválido no item ${index + 1} de "${nomeArquivo}" (tag "prod" ausente).`,
        422
      );
    }
    const codigo = texto(prod.cProd);
    const descricao = texto(prod.xProd);
    const quantidade = parseQuantidadeObrigatoria(
      prod.qCom,
      `item ${index + 1} de "${nomeArquivo}"`
    );

    if (!codigo || !descricao) {
      throw new AppError(
        `Produto incompleto no item ${index + 1} de "${nomeArquivo}" (código/descrição ausentes).`,
        422
      );
    }

    return { codigo, descricao, quantidade };
  });

  return { chaveAcesso, cnpjEmitente, produtos };
}
