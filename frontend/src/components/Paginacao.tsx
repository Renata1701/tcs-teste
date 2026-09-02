import React from "react";

export type PaginaOuReticencias = number | "ellipsis";

export function gerarPaginasVisiveis(
  atual: number,
  total: number
): PaginaOuReticencias[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const paginas: PaginaOuReticencias[] = [1];
  const inicio = Math.max(2, atual - 1);
  const fim = Math.min(total - 1, atual + 1);

  if (inicio > 2) paginas.push("ellipsis");
  for (let i = inicio; i <= fim; i++) paginas.push(i);
  if (fim < total - 1) paginas.push("ellipsis");
  paginas.push(total);

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
  if (totalItens === 0) return null;

  const visiveis = gerarPaginasVisiveis(pagina, totalPaginas);
  const irPara = (destino: number) => {
    const proxima = Math.min(totalPaginas, Math.max(1, destino));
    if (proxima !== pagina) onChange(proxima);
  };

  return (
    <nav className="pagination" aria-label="Paginação">
      <p className="pagination__info">
        Mostrando <strong>{inicio}</strong>–<strong>{fim}</strong> de{" "}
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

        <div className="pagination__controls">
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
          <button
            type="button"
            className="pagination__btn"
            onClick={() => irPara(pagina - 1)}
            disabled={pagina === 1}
            aria-label="Página anterior"
            title="Página anterior"
          >
            ‹
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
            className="pagination__btn"
            onClick={() => irPara(pagina + 1)}
            disabled={pagina === totalPaginas}
            aria-label="Próxima página"
            title="Próxima página"
          >
            ›
          </button>
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
        </div>
      </div>
    </nav>
  );
}
