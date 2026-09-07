export interface ResultadoArquivo {
  arquivo: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export type StatusConsolidado = "sucesso" | "erro" | "parcial";

export function resultadosDoArquivo<T extends { arquivo: string }>(
  nomeOriginal: string,
  resultados: T[]
): T[] {
  const prefixoZip = `${nomeOriginal} » `;
  return resultados.filter(
    (item) =>
      item.arquivo === nomeOriginal || item.arquivo.startsWith(prefixoZip)
  );
}

export function consolidarStatus(resultados: ResultadoArquivo[]): {
  status: StatusConsolidado;
  mensagem: string;
} {
  if (!resultados.length) {
    return {
      status: "erro",
      mensagem: "Nenhum retorno do servidor para este arquivo.",
    };
  }

  const sucessos = resultados.filter((item) => item.status === "sucesso").length;
  const erros = resultados.length - sucessos;

  if (erros === 0) {
    return {
      status: "sucesso",
      mensagem:
        resultados.length === 1
          ? resultados[0].mensagem
          : `${sucessos} documento(s) processado(s) com sucesso.`,
    };
  }

  if (sucessos === 0) {
    return {
      status: "erro",
      mensagem:
        resultados.length === 1
          ? resultados[0].mensagem
          : `${erros} documento(s) com erro. Veja o detalhamento abaixo.`,
    };
  }

  return {
    status: "parcial",
    mensagem: `Processado com ressalvas: ${sucessos} sucesso(s) e ${erros} erro(s). Veja o detalhamento abaixo.`,
  };
}
