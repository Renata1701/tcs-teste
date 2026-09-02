import AdmZip from "adm-zip";
import { AppError } from "../errors/AppError";
import { NFe } from "../models/NFe";
import { parseNFeXml } from "./xml.service";
import { parseNFePdf } from "./pdf.service";
import {
  IArquivoRecebido,
  IDadosNFeExtraidos,
  IResultadoProcessamento,
  StatusProcessamento,
  TipoArquivoOrigem,
} from "../types/document";

const EXTENSOES_PERMITIDAS = [".xml", ".pdf", ".zip"];
const EXTENSOES_PERMITIDAS_NO_ZIP = [".xml", ".pdf"];

function obterExtensao(nome: string): string {
  const idx = nome.lastIndexOf(".");
  if (idx === -1) return "";
  return nome.slice(idx).toLowerCase();
}

/**
 * Persiste os dados extraídos de uma NF-e, tratando duplicidade
 * pela chave de acesso.
 */
async function salvarNFe(
  dados: IDadosNFeExtraidos,
  arquivoOrigem: string,
  tipoArquivo: TipoArquivoOrigem
): Promise<void> {
  const jaExiste = await NFe.findOne({ chaveAcesso: dados.chaveAcesso });
  if (jaExiste) {
    throw new AppError(
      `NF-e duplicada: já existe um registro com a chave de acesso ${dados.chaveAcesso}.`,
      409
    );
  }

  try {
    await NFe.create({
      chaveAcesso: dados.chaveAcesso,
      cnpjEmitente: dados.cnpjEmitente,
      produtos: dados.produtos,
      arquivoOrigem,
      tipoArquivo,
    });
  } catch (error: any) {
    // Proteção extra contra condição de corrida em duplicidade (índice unique)
    if (error?.code === 11000) {
      throw new AppError(
        `NF-e duplicada: já existe um registro com a chave de acesso ${dados.chaveAcesso}.`,
        409
      );
    }
    throw new AppError(
      `Falha ao salvar NF-e extraída de "${arquivoOrigem}": ${error?.message ?? "erro desconhecido"}.`,
      500
    );
  }
}

/**
 * Processa um único arquivo (XML ou PDF, já fora de qualquer ZIP)
 * e retorna o resultado individual.
 */
async function processarArquivoUnico(
  nome: string,
  buffer: Buffer
): Promise<IResultadoProcessamento> {
  const extensao = obterExtensao(nome);

  try {
    let dados: IDadosNFeExtraidos;
    let tipo: TipoArquivoOrigem;

    if (extensao === ".xml") {
      dados = await parseNFeXml(buffer, nome);
      tipo = "xml";
    } else if (extensao === ".pdf") {
      dados = await parseNFePdf(buffer, nome);
      tipo = "pdf";
    } else {
      throw new AppError(
        `Formato de arquivo não permitido: "${nome}". Formatos aceitos: .xml, .pdf, .zip.`,
        415
      );
    }

    await salvarNFe(dados, nome, tipo);

    return {
      arquivo: nome,
      status: StatusProcessamento.SUCESSO,
      mensagem: `NF-e processada e salva com sucesso (${dados.produtos.length} produto(s)).`,
      dados: {
        chaveAcesso: dados.chaveAcesso,
        cnpjEmitente: dados.cnpjEmitente,
        quantidadeProdutos: dados.produtos.length,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return {
        arquivo: nome,
        status: StatusProcessamento.ERRO,
        mensagem: error.message,
      };
    }
    return {
      arquivo: nome,
      status: StatusProcessamento.ERRO,
      mensagem: `Falha inesperada ao processar "${nome}".`,
    };
  }
}

/**
 * Processa um arquivo ZIP: descompacta em memória, valida o conteúdo
 * e processa cada entrada individualmente.
 */
async function processarZip(
  nomeZip: string,
  buffer: Buffer
): Promise<IResultadoProcessamento[]> {
  let zip: AdmZip;

  try {
    zip = new AdmZip(buffer);
  } catch (error) {
    return [
      {
        arquivo: nomeZip,
        status: StatusProcessamento.ERRO,
        mensagem: `ZIP inválido ou corrompido: "${nomeZip}".`,
      },
    ];
  }

  const entradas = zip.getEntries().filter((entry) => !entry.isDirectory);

  if (!entradas.length) {
    return [
      {
        arquivo: nomeZip,
        status: StatusProcessamento.ERRO,
        mensagem: `O arquivo ZIP "${nomeZip}" está vazio.`,
      },
    ];
  }

  const resultados: IResultadoProcessamento[] = [];

  for (const entry of entradas) {
    const nomeInterno = `${nomeZip} » ${entry.entryName}`;
    const extensao = obterExtensao(entry.entryName);

    if (!EXTENSOES_PERMITIDAS_NO_ZIP.includes(extensao)) {
      resultados.push({
        arquivo: nomeInterno,
        status: StatusProcessamento.ERRO,
        mensagem: `Formato não permitido dentro do ZIP: "${entry.entryName}". Apenas .xml e .pdf são aceitos.`,
      });
      continue;
    }

    const conteudo = entry.getData();
    const resultado = await processarArquivoUnico(nomeInterno, conteudo);
    resultados.push(resultado);
  }

  return resultados;
}

export async function processUpload(
  arquivos: IArquivoRecebido[]
): Promise<IResultadoProcessamento[]> {
  if (!arquivos || arquivos.length === 0) {
    throw new AppError("Nenhum arquivo enviado.", 400);
  }

  const resultados: IResultadoProcessamento[] = [];

  for (const arquivo of arquivos) {
    const extensao = obterExtensao(arquivo.originalname);

    if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
      resultados.push({
        arquivo: arquivo.originalname,
        status: StatusProcessamento.ERRO,
        mensagem: `Formato de arquivo não permitido: "${arquivo.originalname}". Formatos aceitos: .xml, .pdf, .zip.`,
      });
      continue;
    }

    if (extensao === ".zip") {
      const resultadosZip = await processarZip(
        arquivo.originalname,
        arquivo.buffer
      );
      resultados.push(...resultadosZip);
    } else {
      const resultado = await processarArquivoUnico(
        arquivo.originalname,
        arquivo.buffer
      );
      resultados.push(resultado);
    }
  }

  return resultados;
}

export interface IPaginacaoNFe {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IListagemNFes {
  nfes: Array<{
    id: string;
    chaveAcesso: string;
    cnpjEmitente: string;
    quantidadeProdutos: number;
    arquivoOrigem: string;
    tipoArquivo: TipoArquivoOrigem;
    createdAt: Date;
  }>;
  paginacao: IPaginacaoNFe;
}

export async function listarNFes(
  pageSolicitada = 1,
  limitSolicitado = 10
): Promise<IListagemNFes> {
  const limit = Math.min(50, Math.max(1, Math.trunc(limitSolicitado) || 10));
  const total = await NFe.countDocuments();
  const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
  const page = Math.min(
    totalPages,
    Math.max(1, Math.trunc(pageSolicitada) || 1)
  );

  const documentos = await NFe.find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    nfes: documentos.map((doc) => ({
      id: String(doc._id),
      chaveAcesso: doc.chaveAcesso,
      cnpjEmitente: doc.cnpjEmitente,
      quantidadeProdutos: doc.produtos?.length ?? 0,
      arquivoOrigem: doc.arquivoOrigem,
      tipoArquivo: doc.tipoArquivo,
      createdAt: doc.createdAt,
    })),
    paginacao: { page, limit, total, totalPages },
  };
}
