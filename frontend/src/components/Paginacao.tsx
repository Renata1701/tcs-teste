import React, { FormEvent, useEffect, useId, useState } from "react";

export type PaginaOuReticencias = number | "ellipsis";

export function gerarPaginasVisiveis(
  atual: number,
  total: number
): PaginaOuReticencias[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const incluidas = new Set<number>([1, total, atual]);
  for (let i = atual - 1; i <= atual + 1; i += 1) {
    if (i > 1 && i < total) incluidas.add(i);
  }

  const ordenadas = [...incluidas].sort((a, b) => a - b);
  const paginas: PaginaOuReticencias[] = [];

  ordenadas.forEach((numero, indice) => {
    if (indice > 0 && numero - ordenadas[indice - 1] > 1) {
      paginas.push("ellipsis");
    }
    paginas.push(numero);
  });

  return paginas;
}

interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  totalItens: number;
  inicio: number;
  fim: number;
  onChange: (pagina: number) => void;
  rotuloItens?: string;
  tamanhosPagina?: number[];
  tamanhoPagina?: number;
  onChangeTamanho?: (tamanho: number) => void;
}

export function Paginacao({
  pagina,
  totalPaginas,
  totalItens,
  inicio,
  fim,
  onChange,
  rotuloItens = "itens",
  tamanhosPagina,
  tamanhoPagina,
  onChangeTamanho,
}: PaginacaoProps) {
  const campoId = useId();
  const [destino, setDestino] = useState(String(pagina));

  useEffect(() => {
    setDestino(String(pagina));
  }, [pagina]);

  if (totalItens === 0) return null;

  const visiveis = gerarPaginasVisiveis(pagina, totalPaginas);
  const mostrarControles = totalPaginas > 1;
  const mostrarAtalhosExtremos = totalPaginas > 4;
  const mostrarIrPara = totalPaginas > 5;

  const irPara = (destinoPagina: number) => {
    const proxima = Math.min(totalPaginas, Math.max(1, destinoPagina));
    if (proxima !== pagina) onChange(proxima);
  };

  const confirmarDestino = (evento?: FormEvent) => {
    evento?.preventDefault();
    const numero = Number(destino);
    if (!Number.isInteger(numero)) {
      setDestino(String(pagina));
      return;
    }
    irPara(numero);
  };

  return (
    <nav className="pagination" aria-label="Paginação">
      <p className="pagination__info" aria-live="polite">
        Mostrando <strong>{inicio}</strong> a <strong>{fim}</strong> de{" "}
        <strong>{totalItens}</strong> {rotuloItens}
      </p>

      <div className="pagination__toolbar">
        {tamanhosPagina && tamanhoPagina && onChangeTamanho && (
          <label className="pagination__size">
            <span>Por página</span>
            <select
              value={tamanhoPagina}
              onChange={(e) => onChangeTamanho(Number(e.target.value))}
              aria-label="Itens por página"
            >
              {tamanhosPagina.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}

        {mostrarControles && (
          <div className="pagination__controls">
            {mostrarAtalhosExtremos && (
              <button
                type="button"
                className="pagination__btn"
                onClick={() => irPara(1)}
                disabled={pagina === 1}
                aria-label="Primeira página"
                title="Primeira página"
              >
                «
              </button>
            )}
            <button
              type="button"
              className="pagination__btn pagination__btn--label"
              onClick={() => irPara(pagina - 1)}
              disabled={pagina === 1}
            >
              Anterior
            </button>

            {visiveis.map((item, idx) =>
              item === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="pagination__ellipsis"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`pagination__btn pagination__btn--page${
                    item === pagina ? " pagination__btn--current" : ""
                  }`}
                  onClick={() => irPara(item)}
                  aria-label={`Página ${item}`}
                  aria-current={item === pagina ? "page" : undefined}
                >
                  {item}
                </button>
              )
            )}

            <button
              type="button"
              className="pagination__btn pagination__btn--label"
              onClick={() => irPara(pagina + 1)}
              disabled={pagina === totalPaginas}
            >
              Próxima
            </button>
            {mostrarAtalhosExtremos && (
              <button
                type="button"
                className="pagination__btn"
                onClick={() => irPara(totalPaginas)}
                disabled={pagina === totalPaginas}
                aria-label="Última página"
                title="Última página"
              >
                »
              </button>
            )}
          </div>
        )}

        {mostrarIrPara && (
          <form className="pagination__goto" onSubmit={confirmarDestino}>
            <label htmlFor={campoId}>Ir para</label>
            <input
              id={campoId}
              type="number"
              min={1}
              max={totalPaginas}
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              onBlur={() => confirmarDestino()}
              aria-label={`Ir para página, de 1 a ${totalPaginas}`}
            />
          </form>
        )}
      </div>
    </nav>
  );
}
