import { Schema, model, Document } from "mongoose";

export interface IProduto {
  codigo: string;
  descricao: string;
  quantidade: number;
}

export interface INFe extends Document {
  chaveAcesso: string;
  cnpjEmitente: string;
  produtos: IProduto[];
  arquivoOrigem: string;
  tipoArquivo: "xml" | "pdf";
  createdAt: Date;
  updatedAt: Date;
}

const ProdutoSchema = new Schema<IProduto>(
  {
    codigo: { type: String, required: true },
    descricao: { type: String, required: true },
    quantidade: { type: Number, required: true },
  },
  { _id: false }
);

const NFeSchema = new Schema<INFe>(
  {
    chaveAcesso: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 44,
      maxlength: 44,
    },
    cnpjEmitente: { type: String, required: true },
    produtos: {
      type: [ProdutoSchema],
      required: true,
      validate: {
        validator: (v: IProduto[]) => Array.isArray(v) && v.length > 0,
        message: "A NF-e deve possuir ao menos um produto.",
      },
    },
    arquivoOrigem: { type: String, required: true },
    tipoArquivo: { type: String, enum: ["xml", "pdf"], required: true },
  },
  { timestamps: true }
);

export const NFe = model<INFe>("NFe", NFeSchema);
