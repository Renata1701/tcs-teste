import { AppError } from "../errors/AppError";
import { IProdutoExtraido } from "../types/document";
import { parseQuantidadeObrigatoria } from "../utils/quantidade";

const REGEX_CNPJ =
  /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g;

const REGEX_PRODUTO_TESTE =
  /PRODUTO:\s*CODIGO\s*=\s*([^;]+);\s*DESCRICAO\s*=\s*([^;]+);\s*QUANTIDADE\s*=\s*([\d.,]+)/gi;

const REGEX_PRODUTO_ROTULADO =
  /C(?:O|Ó)DIGO\s*[:=]\s*(\S+)\s+DESCRI(?:C|Ç)(?:A|Ã)O\s*[:=]\s*(.+?)\s+QUANTIDADE\s*[:=]\s*([\d.,]+)/gi;

const REGEX_PRODUTO_TABELA =
  /^([A-Z0-9._\-\/]{1,40})\s+(.+?)\s+(\d{8})\s+\S+\s+(\d{3,4})\s+([A-Z]{1,6})\s+([\d.,]+)/gim;

function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function normalizarCnpj(valor: string): string | null {
  const digitos = somenteDigitos(valor);
  return digitos.length === 14 ? digitos : null;
}

export function extrairChaveAcesso(texto: string): string | null {
  const candidatos = texto.match(/\d[\d.\s]{40,90}\d/g) ?? [];

  for (const candidato of candidatos) {
    const digitos = somenteDigitos(candidato);
    if (digitos.length === 44) {
      return digitos;
    }
  }

  const direto = texto.match(/\b\d{44}\b/);
  return direto ? direto[0] : null;
}

export function cnpjDaChaveAcesso(chaveAcesso: string): string | null {
  const digitos = somenteDigitos(chaveAcesso);
  if (digitos.length !== 44) return null;
  return digitos.slice(6, 20);
}

function cnpjAposRotuloEmitente(texto: string): string | null {
  const rotulado = texto.match(
    /CNPJ\s*(?:\/\s*CPF)?\s*(?:DO\s+)?EMITENTE\s*[:\s]+(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i
  );
  if (rotulado) {
    return normalizarCnpj(rotulado[1]);
  }

  const secao = texto.match(
    /(?:IDENTIFICA[CÇ][AÃ]O\s+DO\s+)?EMITENTE\b([\s\S]*?)(?:DESTINAT|DADOS\s+DO\s+DESTINAT|PRODUTOS|DADOS\s+DOS\s+PRODUTOS|$)/i
  );
  if (!secao) return null;

  const naSecao = secao[1].match(REGEX_CNPJ);
  return naSecao ? normalizarCnpj(naSecao[0]) : null;
}

export function extrairCnpjEmitente(
  texto: string,
  chaveAcesso?: string | null
): string | null {
  const daChave = chaveAcesso ? cnpjDaChaveAcesso(chaveAcesso) : null;
  const rotulado = cnpjAposRotuloEmitente(texto);

  if (daChave && rotulado && rotulado !== daChave) {
    return daChave;
  }

  if (daChave) return daChave;
  if (rotulado) return rotulado;

  REGEX_CNPJ.lastIndex = 0;
  const primeiro = REGEX_CNPJ.exec(texto);
  return primeiro ? normalizarCnpj(primeiro[1]) : null;
}

function adicionarProduto(
  produtos: IProdutoExtraido[],
  codigo: string,
  descricao: string,
  quantidadeBruta: string
): void {
  const codigoLimpo = codigo.trim();
  const descricaoLimpa = descricao.trim();

  if (!codigoLimpo || !descricaoLimpa) {
    throw new AppError(
      "Produto incompleto no PDF (código/descrição ausentes).",
      422
    );
  }

  const jaExiste = produtos.some(
    (item) =>
      item.codigo === codigoLimpo && item.descricao === descricaoLimpa
  );
  if (jaExiste) return;

  const quantidade = parseQuantidadeObrigatoria(
    quantidadeBruta,
    `produto "${codigoLimpo}"`
  );

  produtos.push({
    codigo: codigoLimpo,
    descricao: descricaoLimpa,
    quantidade,
  });
}

export function extrairProdutos(texto: string): IProdutoExtraido[] {
  const produtos: IProdutoExtraido[] = [];

  const aplicar = (regex: RegExp, codigoIdx: number, descIdx: number, qtdIdx: number) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(texto)) !== null) {
      adicionarProduto(produtos, match[codigoIdx], match[descIdx], match[qtdIdx]);
    }
  };

  aplicar(REGEX_PRODUTO_TESTE, 1, 2, 3);
  if (produtos.length) return produtos;

  aplicar(REGEX_PRODUTO_ROTULADO, 1, 2, 3);
  if (produtos.length) return produtos;

  aplicar(REGEX_PRODUTO_TABELA, 1, 2, 6);
  if (produtos.length) return produtos;

  const blocos = texto.split(/PRODUTO\s*\d+|ITEM\s*\d+/i);
  for (const bloco of blocos) {
    const codigo =
      bloco.match(/C(?:O|Ó)DIGO\s*[:=]\s*(\S+)/i)?.[1] ??
      bloco.match(/\bcProd\s*[:=]?\s*(\S+)/i)?.[1];
    const descricao =
      bloco.match(/DESCRI(?:C|Ç)(?:A|Ã)O\s*[:=]\s*(.+)/i)?.[1] ??
      bloco.match(/\bxProd\s*[:=]?\s*(.+)/i)?.[1];
    const quantidade =
      bloco.match(/QUANTIDADE\s*[:=]\s*([\d.,]+)/i)?.[1] ??
      bloco.match(/\bqCom\s*[:=]?\s*([\d.,]+)/i)?.[1];

    if (codigo && descricao && quantidade) {
      adicionarProduto(
        produtos,
        codigo,
        descricao.split(/\r?\n/)[0],
        quantidade
      );
    }
  }

  return produtos;
}
