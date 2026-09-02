import { useEffect, useMemo, useState } from "react";

export function usePaginacao<T>(itens: T[], tamanhoInicial = 5) {
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPaginaEstado] = useState(tamanhoInicial);

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

  const setTamanhoPagina = (novoTamanho: number) => {
    setTamanhoPaginaEstado(novoTamanho);
    setPagina(1);
  };

  return {
    pagina: paginaSegura,
    setPagina,
    tamanhoPagina,
    setTamanhoPagina,
    totalPaginas,
    fatia,
    inicioExibicao,
    fimExibicao,
    total,
    irParaUltima: () =>
      setPagina(Math.max(1, Math.ceil(itens.length / tamanhoPagina))),
  };
}
