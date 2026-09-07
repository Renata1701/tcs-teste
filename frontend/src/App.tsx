import React, { useCallback, useEffect, useRef, useState } from "react";
import { Paginacao } from "./components/Paginacao";
import { usePaginacao } from "./hooks/usePaginacao";
import { consolidarStatus, resultadosDoArquivo } from "./lib/resultados";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "/api/documents";
const API_UPLOAD = `${API_BASE}/upload`;

function mensagemDeRede(error: unknown): string {
  const texto = error instanceof Error ? error.message : "";
  if (texto === "Failed to fetch" || texto === "NetworkError when attempting to fetch resource.") {
    return "Não foi possível conectar à API. Confirme se o backend está em execução e recarregue a página.";
  }
  return texto || "Não foi possível carregar os documentos processados.";
}

const EXTENSOES_ACEITAS = [".xml", ".pdf", ".zip"];
const TAMANHO_MAXIMO_MB = 20;
const QUANTIDADE_MAXIMA = 20;
const TAMANHOS_PAGINA = [5, 10, 20];

function irParaPaginaDaLista(
  alterarPagina: (pagina: number) => void,
  ancoraId: string
) {
  return (pagina: number) => {
    alterarPagina(pagina);
    document
      .getElementById(ancoraId)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
}

type Status =
  | "aguardando"
  | "enviando"
  | "processando"
  | "sucesso"
  | "parcial"
  | "erro";

interface ArquivoSelecionado {
  id: string;
  file: File;
  status: Status;
  mensagem?: string;
}

interface ResultadoBackend {
  arquivo: string;
  status: "sucesso" | "erro";
  mensagem: string;
  dados?: {
    chaveAcesso: string;
    cnpjEmitente: string;
    quantidadeProdutos: number;
  };
}

interface DocumentoSalvo {
  id: string;
  chaveAcesso: string;
  cnpjEmitente: string;
  quantidadeProdutos: number;
  arquivoOrigem: string;
  tipoArquivo: "xml" | "pdf";
  createdAt: string;
}

interface PaginacaoServidor {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extensaoDe(nome: string): string {
  const idx = nome.lastIndexOf(".");
  return idx === -1 ? "" : nome.slice(idx).toLowerCase();
}

function rotuloTipo(nome: string): string {
  const ext = extensaoDe(nome).replace(".", "").toUpperCase();
  return ext || "ARQUIVO";
}

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatarCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "").padStart(14, "0").slice(-14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarChave(chave: string): string {
  return chave.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<Status, string> = {
  aguardando: "Aguardando",
  enviando: "Enviando",
  processando: "Processando",
  sucesso: "Sucesso",
  parcial: "Parcial",
  erro: "Erro",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge--${status}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function App() {
  const [arquivos, setArquivos] = useState<ArquivoSelecionado[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [enviandoLote, setEnviandoLote] = useState(false);
  const [resultadosDetalhados, setResultadosDetalhados] = useState<
    ResultadoBackend[] | null
  >(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [documentos, setDocumentos] = useState<DocumentoSalvo[]>([]);
  const [paginacaoDocs, setPaginacaoDocs] = useState<PaginacaoServidor>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [carregandoDocs, setCarregandoDocs] = useState(false);
  const [erroDocs, setErroDocs] = useState<string | null>(null);

  const pagArquivos = usePaginacao(arquivos, 5);
  const pagResultados = usePaginacao(resultadosDetalhados ?? [], 5);
  const irParaPaginaArquivos = pagArquivos.setPagina;
  const irParaPaginaResultados = pagResultados.setPagina;

  const carregarDocumentos = useCallback(async (page: number, limit: number) => {
    setCarregandoDocs(true);
    setErroDocs(null);

    const tentativas = 3;
    let ultimoErro: unknown = null;

    for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
      try {
        const resposta = await fetch(
          `${API_BASE}?page=${page}&limit=${limit}`
        );
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          throw new Error(
            corpo?.message || `Falha ao listar documentos (HTTP ${resposta.status}).`
          );
        }
        setDocumentos(corpo?.nfes ?? []);
        setPaginacaoDocs(
          corpo?.paginacao ?? { page, limit, total: 0, totalPages: 1 }
        );
        setErroDocs(null);
        setCarregandoDocs(false);
        return;
      } catch (error: unknown) {
        ultimoErro = error;
        if (tentativa < tentativas) {
          await new Promise((resolve) => setTimeout(resolve, 700 * tentativa));
        }
      }
    }

    setErroDocs(mensagemDeRede(ultimoErro));
    setCarregandoDocs(false);
  }, []);

  useEffect(() => {
    void carregarDocumentos(1, 10);
  }, [carregarDocumentos]);

  const adicionarArquivos = useCallback((lista: FileList | File[]) => {
    setErroGeral(null);
    const novos: ArquivoSelecionado[] = [];

    Array.from(lista).forEach((file) => {
      const ext = extensaoDe(file.name);

      if (!EXTENSOES_ACEITAS.includes(ext)) {
        novos.push({
          id: gerarId(),
          file,
          status: "erro",
          mensagem: `Formato não permitido. Aceitos: ${EXTENSOES_ACEITAS.join(", ")}`,
        });
        return;
      }

      if (file.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
        novos.push({
          id: gerarId(),
          file,
          status: "erro",
          mensagem: `Arquivo excede o limite de ${TAMANHO_MAXIMO_MB}MB.`,
        });
        return;
      }

      novos.push({ id: gerarId(), file, status: "aguardando" });
    });

    setArquivos((atual) => {
      const combinados = [...atual, ...novos];
      const resultado =
        combinados.length > QUANTIDADE_MAXIMA
          ? combinados.slice(0, QUANTIDADE_MAXIMA)
          : combinados;

      if (combinados.length > QUANTIDADE_MAXIMA) {
        setErroGeral(
          `Limite de ${QUANTIDADE_MAXIMA} arquivos por envio. Apenas os primeiros ${QUANTIDADE_MAXIMA} foram mantidos.`
        );
      }

      const jaHaviaArquivos = atual.length > 0;
      const ultimaPagina = Math.max(
        1,
        Math.ceil(resultado.length / pagArquivos.tamanhoPagina)
      );
      irParaPaginaArquivos(jaHaviaArquivos ? ultimaPagina : 1);
      return resultado;
    });
  }, [irParaPaginaArquivos, pagArquivos.tamanhoPagina]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      adicionarArquivos(e.target.files);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setArrastando(false);
    if (e.dataTransfer.files?.length) {
      adicionarArquivos(e.dataTransfer.files);
    }
  };

  const removerArquivo = (id: string) => {
    setArquivos((atual) => atual.filter((a) => a.id !== id));
  };

  const limparArquivos = () => {
    setArquivos([]);
    setResultadosDetalhados(null);
    setErroGeral(null);
    irParaPaginaArquivos(1);
    irParaPaginaResultados(1);
  };

  const enviarDocumentos = async () => {
    const pendentes = arquivos.filter((a) => a.status === "aguardando");

    if (!pendentes.length) {
      setErroGeral("Nenhum arquivo pendente para enviar.");
      return;
    }

    setErroGeral(null);
    setResultadosDetalhados(null);
    irParaPaginaResultados(1);
    setEnviandoLote(true);

    setArquivos((atual) =>
      atual.map((a) =>
        a.status === "aguardando"
          ? { ...a, status: "enviando", mensagem: undefined }
          : a
      )
    );

    const formData = new FormData();
    pendentes.forEach((a) => formData.append("files", a.file));

    try {
      setArquivos((atual) =>
        atual.map((a) =>
          a.status === "enviando" ? { ...a, status: "processando" } : a
        )
      );

      const resposta = await fetch(API_UPLOAD, {
        method: "POST",
        body: formData,
      });

      const corpo = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        throw new Error(
          corpo?.message || `Falha na comunicação com o servidor (HTTP ${resposta.status}).`
        );
      }

      const resultados: ResultadoBackend[] = corpo?.resultados ?? [];
      setResultadosDetalhados(resultados);
      irParaPaginaResultados(1);

      setArquivos((atual) =>
        atual.map((a) => {
          if (a.status !== "processando") return a;
          const relacionados = resultadosDoArquivo(a.file.name, resultados);
          const consolidado = consolidarStatus(relacionados);
          return {
            ...a,
            status: consolidado.status,
            mensagem: consolidado.mensagem,
          };
        })
      );

      await carregarDocumentos(1, paginacaoDocs.limit);
    } catch (error: any) {
      setErroGeral(
        error?.message ||
          "Falha de comunicação com o servidor. Verifique se a API está em execução."
      );
      setArquivos((atual) =>
        atual.map((a) =>
          a.status === "enviando" || a.status === "processando"
            ? { ...a, status: "erro", mensagem: "Falha de comunicação com o servidor." }
            : a
        )
      );
    } finally {
      setEnviandoLote(false);
    }
  };

  const totalArquivos = arquivos.length;
  const podeEnviar =
    totalArquivos > 0 && !enviandoLote && arquivos.some((a) => a.status === "aguardando");

  const inicioDocs =
    paginacaoDocs.total === 0
      ? 0
      : (paginacaoDocs.page - 1) * paginacaoDocs.limit + 1;
  const fimDocs = Math.min(
    paginacaoDocs.page * paginacaoDocs.limit,
    paginacaoDocs.total
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__logo">TCS</div>
          <div>
            <h1>Terminal de Cargas de Sarzedo</h1>
            <p>Recebimento e Processamento de Documentos Eletrônicos</p>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="card">
          <h2 className="card__title">Envio de documentos</h2>
          <p className="card__subtitle">
            Envie XML de NF-e, PDF (DANFE) ou pacotes ZIP contendo múltiplos documentos.
          </p>

          <div
            className={`dropzone ${arrastando ? "dropzone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xml,.pdf,.zip"
              onChange={handleInputChange}
              hidden
            />
            <div className="dropzone__icon">⬆</div>
            <p className="dropzone__title">
              Arraste os arquivos aqui ou <span>clique para selecionar</span>
            </p>
            <p className="dropzone__hint">
              Formatos aceitos: .xml, .pdf, .zip — até {QUANTIDADE_MAXIMA} arquivos, {TAMANHO_MAXIMO_MB}MB cada
            </p>
          </div>

          {erroGeral && <div className="alert alert--erro">{erroGeral}</div>}

          {totalArquivos > 0 && (
            <>
              <div className="list-header">
                <h3 className="list-header__title">Arquivos selecionados</h3>
                <span className="list-header__count">{totalArquivos} arquivo(s)</span>
              </div>

              <div className="file-list" id="lista-arquivos">
                {pagArquivos.fatia.map((a) => (
                  <div className="file-row" key={a.id}>
                    <div className="file-row__info">
                      <div className="file-row__type">{rotuloTipo(a.file.name)}</div>
                      <div className="file-row__details">
                        <span className="file-row__name">{a.file.name}</span>
                        <span className="file-row__meta">
                          {formatarTamanho(a.file.size)}
                          {a.mensagem ? ` · ${a.mensagem}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="file-row__actions">
                      <StatusBadge status={a.status} />
                      <button
                        className="icon-btn"
                        onClick={() => removerArquivo(a.id)}
                        title="Remover arquivo"
                        disabled={enviandoLote}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <Paginacao
                pagina={pagArquivos.pagina}
                totalPaginas={pagArquivos.totalPaginas}
                totalItens={pagArquivos.total}
                inicio={pagArquivos.inicioExibicao}
                fim={pagArquivos.fimExibicao}
                onChange={irParaPaginaDaLista(pagArquivos.setPagina, "lista-arquivos")}
                rotuloItens="arquivo(s)"
                tamanhosPagina={TAMANHOS_PAGINA}
                tamanhoPagina={pagArquivos.tamanhoPagina}
                onChangeTamanho={pagArquivos.setTamanhoPagina}
              />

              <div className="actions">
                <button
                  className="btn btn--ghost"
                  onClick={limparArquivos}
                  disabled={enviandoLote}
                >
                  Limpar arquivos
                </button>
                <button
                  className="btn btn--primary"
                  onClick={enviarDocumentos}
                  disabled={!podeEnviar}
                >
                  {enviandoLote ? "Enviando..." : "Enviar documentos"}
                </button>
              </div>
            </>
          )}
        </section>

        {resultadosDetalhados && (
          <section className="card">
            <div className="list-header">
              <div>
                <h2 className="card__title">Resultado do processamento</h2>
                <p className="card__subtitle">
                  Inclui itens extraídos de dentro de arquivos ZIP, quando aplicável.
                </p>
              </div>
              <span className="list-header__count">
                {resultadosDetalhados.length} item(ns)
              </span>
            </div>
            <div className="result-list" id="lista-resultados">
              {pagResultados.fatia.map((r, idx) => (
                <div
                  className={`result-row result-row--${r.status}`}
                  key={`${r.arquivo}-${idx}`}
                >
                  <div className="result-row__header">
                    <strong>{r.arquivo}</strong>
                    <span className={`badge badge--${r.status}`}>
                      {r.status === "sucesso" ? "Sucesso" : "Erro"}
                    </span>
                  </div>
                  <p className="result-row__message">{r.mensagem}</p>
                  {r.dados && (
                    <p className="result-row__extra">
                      Chave: {r.dados.chaveAcesso} · CNPJ: {r.dados.cnpjEmitente} ·{" "}
                      {r.dados.quantidadeProdutos} produto(s)
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Paginacao
              pagina={pagResultados.pagina}
              totalPaginas={pagResultados.totalPaginas}
              totalItens={pagResultados.total}
              inicio={pagResultados.inicioExibicao}
              fim={pagResultados.fimExibicao}
              onChange={irParaPaginaDaLista(
                pagResultados.setPagina,
                "lista-resultados"
              )}
              rotuloItens="resultado(s)"
              tamanhosPagina={TAMANHOS_PAGINA}
              tamanhoPagina={pagResultados.tamanhoPagina}
              onChangeTamanho={pagResultados.setTamanhoPagina}
            />
          </section>
        )}

        <section className="card">
          <div className="list-header">
            <div>
              <h2 className="card__title">Documentos processados</h2>
              <p className="card__subtitle">
                NF-es salvas, das mais recentes para as mais antigas.
              </p>
            </div>
            <span className="list-header__count">
              {paginacaoDocs.total} registro(s)
            </span>
          </div>

          {erroDocs && (
            <div className="alert alert--erro">
              {erroDocs}{" "}
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void carregarDocumentos(1, paginacaoDocs.limit)}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {carregandoDocs && documentos.length === 0 && (
            <p className="empty-state">Carregando documentos…</p>
          )}

          {!carregandoDocs && !erroDocs && documentos.length === 0 && (
            <p className="empty-state">
              Nenhum documento processado ainda. Envie um XML, PDF ou ZIP para começar.
            </p>
          )}

          {documentos.length > 0 && (
            <div
              className={`doc-list${carregandoDocs ? " is-loading" : ""}`}
              id="lista-documentos"
            >
              {documentos.map((doc) => (
                <div className="doc-row" key={doc.id}>
                  <div className="file-row__type">
                    {doc.tipoArquivo.toUpperCase()}
                  </div>
                  <div className="doc-row__body">
                    <span className="file-row__name">{doc.arquivoOrigem}</span>
                    <span className="file-row__meta">
                      {formatarChave(doc.chaveAcesso)}
                    </span>
                    <span className="file-row__meta">
                      CNPJ {formatarCnpj(doc.cnpjEmitente)} ·{" "}
                      {doc.quantidadeProdutos} produto(s) · {formatarData(doc.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Paginacao
            pagina={paginacaoDocs.page}
            totalPaginas={paginacaoDocs.totalPages}
            totalItens={paginacaoDocs.total}
            inicio={inicioDocs}
            fim={fimDocs}
            onChange={(page) => {
              void carregarDocumentos(page, paginacaoDocs.limit);
              document
                .getElementById("lista-documentos")
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
            rotuloItens="documento(s)"
            tamanhosPagina={TAMANHOS_PAGINA}
            tamanhoPagina={paginacaoDocs.limit}
            onChangeTamanho={(limit) => {
              void carregarDocumentos(1, limit);
            }}
          />
        </section>
      </main>

      <footer className="footer">
        Terminal de Cargas de Sarzedo — Sistema interno de recebimento de documentos
      </footer>
    </div>
  );
}
