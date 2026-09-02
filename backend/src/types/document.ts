export interface IProdutoExtraido {
  codigo: string;
  descricao: string;
  quantidade: number;
}

export interface IDadosNFeExtraidos {
  chaveAcesso: string;
  cnpjEmitente: string;
  produtos: IProdutoExtraido[];
}

export type TipoArquivoOrigem = "xml" | "pdf";

export enum StatusProcessamento {
  SUCESSO = "sucesso",
  ERRO = "erro",
}

export interface IResultadoProcessamento {
  arquivo: string;
  status: StatusProcessamento;
  mensagem: string;
  dados?: {
    chaveAcesso: string;
    cnpjEmitente: string;
    quantidadeProdutos: number;
  };
}

export interface IArquivoRecebido {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}
