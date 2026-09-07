# TCS — Recebimento e Processamento de Documentos Eletrônicos

Aplicação web para que transportadoras enviem antecipadamente os documentos
eletrônicos (NF-e em XML, DANFE em PDF, ou pacotes ZIP) relacionados às cargas
recebidas no **Terminal de Cargas de Sarzedo (TCS)**, que processa cerca de
2.000 veículos e 54 mil toneladas de minério por dia.

## Sumário

- [Tecnologias](#tecnologias)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Funcionalidades](#funcionalidades)
- [Decisões técnicas](#decisões-técnicas)
- [Instalação](#instalação)
- [Execução](#execução)
- [Configuração do MongoDB](#configuração-do-mongodb)
- [Endpoints da API](#endpoints-da-api)
- [Exemplos de teste](#exemplos-de-teste)
- [Limitações](#limitações)
- [Funcionalidades parcialmente concluídas](#funcionalidades-parcialmente-concluídas)

## Tecnologias

**Front-end**
- React 18 + TypeScript
- Vite

**Back-end**
- Node.js + Express + TypeScript
- Multer (`memoryStorage`) para upload
- `xml2js` para parsing de NF-e (XML)
- `pdf-parse` para extração de texto de PDF (DANFE)
- `adm-zip` para descompactação de ZIP em memória

**Banco de dados**
- MongoDB + Mongoose

## Estrutura de pastas

```
tcs-documentos/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── config/database.ts
│       ├── errors/AppError.ts
│       ├── models/NFe.ts
│       ├── routes/documents.routes.ts
│       ├── services/
│       │   ├── xml.service.ts
│       │   ├── pdf.service.ts
│       │   └── document.service.ts
│       ├── types/document.ts
│       ├── app.ts
│       └── server.ts
├── frontend/
│   ├── package.json
│   ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       └── styles.css
├── tests/
│   ├── nfe-valida.xml
│   ├── nfe-valida.pdf
│   ├── nfe-invalida.xml
│   ├── nao-permitido.txt
│   ├── zip-vazio.zip
│   ├── documentos-validos.zip
│   ├── documentos-invalido-formato.zip
│   └── README.md
└── README.md
```

## Funcionalidades

- Upload de múltiplos arquivos simultaneamente, por seleção ou **drag and drop**.
- Aceita `.xml`, `.pdf` e `.zip` (até 20 arquivos, até 20MB cada).
- Lista os arquivos selecionados antes do envio, com nome, tamanho, tipo e status
  (**Aguardando → Enviando → Processando → Sucesso/Parcial/Erro**).
- Pacotes ZIP recebem status consolidado a partir dos arquivos internos
  (`zip » arquivo.xml`), sem tratar o ZIP como erro quando o conteúdo foi processado.
- Apenas arquivos com status **Aguardando** entram no próximo envio; documentos
  já processados não são reenviados.
- Quantidade do produto é obrigatória e deve ser maior que zero.
- Permite remover um arquivo antes do envio e possui botões **"Limpar arquivos"**
  e **"Enviar documentos"**.
- Exibe mensagens de sucesso/erro **individualmente por arquivo**, inclusive para
  cada item extraído de dentro de um ZIP.
- Layout responsivo, com identidade visual corporativa (verde escuro, branco, cinza).
- Back-end extrai de cada NF-e: chave de acesso, CNPJ do emitente e a lista de
  produtos (código, descrição e quantidade), percorrendo **todos** os elementos
  `<det>` do XML.
- ZIP é descompactado em memória; diretórios são ignorados; ZIP vazio, com
  formatos não permitidos, com mais de 50 entradas ou com mais de 50MB
  descompactados é rejeitado. Cada entrada interna também respeita o limite de 20MB.
- Persistência em MongoDB, com verificação de **duplicidade pela chave de acesso**
  antes de salvar.
- Listagem das NF-es salvas (`GET /api/documents`), ordenadas das mais recentes
  para as mais antigas.

## Decisões técnicas

- **`multer.memoryStorage()`**: os arquivos nunca tocam o disco do servidor;
  tudo é processado em memória (`Buffer`) e descartado após o processamento,
  o que simplifica a implantação e evita lixo em disco. O lote é processado
  em sequência e o ZIP tem teto de tamanho descompactado para reduzir o risco
  de consumo excessivo de RAM.
- **Uma linha de erro por arquivo, nunca aborta o lote inteiro**: o endpoint de
  upload sempre retorna `200` com um array `resultados`, no qual cada arquivo
  (ou entrada de ZIP) tem seu próprio `status` (`sucesso`/`erro`) e `mensagem`.
  Isso permite que a interface mostre o resultado granular de cada documento,
  mesmo quando parte do lote falha.
- **`AppError`** centraliza erros esperados (`statusCode` + `message`), tratados
  pelo middleware global de erros em `app.ts`; erros inesperados caem no `catch`
  genérico e retornam `500`.
- **Chave de acesso normalizada por regex/dígitos**: tanto no XML (`atributo Id`
  de `infNFe`, que vem como `"NFe" + 44 dígitos`) quanto no PDF (onde o layout do
  DANFE pode quebrar a chave em blocos separados por espaço), a chave é extraída
  removendo tudo que não for dígito e validando o tamanho de 44 caracteres.
- **Suporte a duas variações de XML de NF-e** (`nfeProc/NFe/infNFe` e
  `NFe/infNFe` direto), cobrindo tanto o XML "processado/autorizado" quanto o
  XML de NF-e "puro".
- **Verificação de duplicidade em duas camadas**: uma consulta prévia
  (`findOne`) para retornar mensagem amigável rapidamente, e o índice `unique`
  do MongoDB como garantia final contra condição de corrida.

## Instalação

Pré-requisitos: Node.js 18+, npm e uma instância MongoDB acessível (local ou
remota).

```bash
# Back-end
cd backend
cp .env.example .env
npm install

# Front-end
cd ../frontend
npm install
```

## Execução

```bash
# Terminal 1 — back-end (http://localhost:3333)
cd backend
npm run dev

# Terminal 2 — front-end (http://localhost:5173)
cd frontend
npm run dev
```

Build de produção:

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

## Configuração do MongoDB

O back-end lê a variável `MONGODB_URI` do arquivo `.env` (veja `.env.example`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/tcs_documentos
PORT=3333
CORS_ORIGIN=http://localhost:5173
```

A URI do MongoDB é mascarada nos logs (usuário e senha não são impressos).
`CORS_ORIGIN` é opcional: se definida, apenas as origens listadas (separadas
por vírgula) são aceitas. Sem ela, o CORS permanece aberto para facilitar o
desenvolvimento local.

O front-end lê `VITE_API_URL` (veja `frontend/.env.example`). Sem essa variável,
usa `http://localhost:3333/api/documents`.

Para rodar um MongoDB local rapidamente com Docker:

```bash
docker run -d --name mongo-tcs -p 27017:27017 mongo:7
```

## Endpoints da API

| Método | Rota                        | Descrição                                                             |
|--------|------------------------------|-------------------------------------------------------------------------|
| GET    | `/health`                    | Verifica se a API está no ar.                                          |
| POST   | `/api/documents/upload`      | Recebe `multipart/form-data` (campo `files`), processa e salva as NF-e. |
| GET    | `/api/documents`             | Lista as NF-es salvas com paginação (`page`, `limit`). Mais recentes primeiro. |

**Resposta de `POST /api/documents/upload`:**

```json
{
  "resultados": [
    {
      "arquivo": "nfe-valida.xml",
      "status": "sucesso",
      "mensagem": "NF-e processada e salva com sucesso (2 produto(s)).",
      "dados": {
        "chaveAcesso": "35240512345678000190550010000000011000000010",
        "cnpjEmitente": "12345678000190",
        "quantidadeProdutos": 2
      }
    },
    {
      "arquivo": "pacote.zip » nao-permitido.txt",
      "status": "erro",
      "mensagem": "Formato não permitido dentro do ZIP: \"nao-permitido.txt\". Apenas .xml e .pdf são aceitos."
    }
  ]
}
```

## Exemplos de teste

A pasta [`tests/`](./tests) contém arquivos prontos (XML válido/inválido, PDF de
exemplo, `.txt` não permitido e pacotes ZIP) e instruções de uso — veja
[`tests/README.md`](./tests/README.md).

Testes automatizados:

```bash
cd backend
npm test
```

Cobrem quantidade obrigatória, mascaramento da URI do MongoDB e parse de XML
(incluindo documento incompleto).

## Limitações

- O parser de PDF depende de texto extraível; **PDFs escaneados como imagem**
  não têm texto extraível e exigiriam **OCR**, o que **não está contemplado
  nesta versão**.
- Em DANFE com texto extraível, o CNPJ do emitente vem da chave de acesso
  (posições 7–20) e é confirmado pelos rótulos `EMITENTE` / `CNPJ DO EMITENTE`.
  Produtos são lidos no formato de teste do projeto, em linhas rotuladas ou
  em linhas tabulares típicas de DANFE (código, descrição, NCM, CFOP, UN,
  quantidade). Layouts muito atípicos ainda podem exigir ajuste.
- O upload em memória é adequado ao desafio; em produção com grande volume,
  o recomendado é fila de processamento e armazenamento em disco ou object
  storage.
- Não há autenticação/autorização — qualquer cliente com acesso à rede pode
  enviar documentos.
- Não há validação criptográfica da assinatura digital do XML nem validação
  completa de dígito verificador da chave de acesso (apenas verificação de
  tamanho/formato).

## Funcionalidades parcialmente concluídas

- **XML**: processado de acordo com a estrutura padrão de NF-e (`nfeProc/NFe/infNFe`
  e `NFe/infNFe`). Variações fora do padrão oficial da SEFAZ podem não ser
  reconhecidas.
- **PDF**: a extração cobre o formato de teste do desafio e DANFEs textuais
  com seção de emitente e tabela de produtos. PDFs escaneados por imagem
  exigiriam OCR (ex.: Tesseract) e não são contemplados nesta versão.
- Em um cenário de produção, itens adicionais seriam recomendados:
  - **Autenticação/autorização** (ex.: JWT, OAuth2) por transportadora.
  - **Filas de processamento** (ex.: RabbitMQ/SQS) para lotes grandes, evitando
    bloquear a requisição HTTP durante o processamento.
  - **Antivírus** nos arquivos recebidos antes do processamento.
  - **Logs estruturados e auditoria** (ex.: Winston/Pino + armazenamento
    centralizado).
  - **Armazenamento dos arquivos originais** em serviços como Amazon S3 ou
    Azure Blob Storage, mantendo apenas os dados extraídos no MongoDB.
  - **Validação de CNPJ** (dígito verificador) e **validação completa da chave
    de acesso da NF-e** (dígito verificador módulo 11), além de validação de
    assinatura digital do XML.
