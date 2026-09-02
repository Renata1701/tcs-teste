import { useEffect, useMemo, useState } from "react";

export function usePaginacao<T>(itens: T[], tamanhoPagina: number) {
  const [pagina, setPagina] = useState(1);

  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanhoPagina) || 1);
  const paginaSegura = Math.min(pagina, totalPaginas);

  useEffect(() => {
    if (pagina !== paginaSegura) {
      setPagina(paginaSegura);
    }
  }, [pagina, paginaSegura]);

  const fatia = useMemo(() => {
    const inicio = (paginaSegura - 1) * tamanhoPagina;
    return itens.slice(inicio, inicio + tamanhoPagina);
  }, [itens, paginaSegura, tamanhoPagina]);

  const inicioExibicao = total === 0 ? 0 : (paginaSegura - 1) * tamanhoPagina + 1;
  const fimExibicao = Math.min(paginaSegura * tamanhoPagina, total);

  return {
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    fatia,
    inicioExibicao,
    fimExibicao,
    total,
    irParaUltima: () =>
      setPagina(Math.max(1, Math.ceil(itens.length / tamanhoPagina))),
  };
}
