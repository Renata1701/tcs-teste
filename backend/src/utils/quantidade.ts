import { AppError } from "../errors/AppError";

export function parseQuantidadeObrigatoria(
  valor: unknown,
  contexto: string
): number {
  const bruto = Array.isArray(valor) ? valor[0] : valor;
  const texto = String(bruto ?? "").trim();

  if (!texto) {
    throw new AppError(
      `Quantidade do produto ausente em ${contexto}.`,
      422
    );
  }

  const numero = Number.parseFloat(texto.replace(",", "."));

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new AppError(
      `Quantidade do produto inválida em ${contexto}. Informe um valor maior que zero.`,
      422
    );
  }

  return numero;
}
