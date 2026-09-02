# Arquivos de teste

Esta pasta contém arquivos prontos para testar manualmente a API (via Postman/Insomnia,
`curl`, ou pela própria interface web).

## Arquivos incluídos

| Arquivo                              | Uso                                                                 |
|---------------------------------------|----------------------------------------------------------------------|
| `nfe-valida.xml`                      | NF-e válida, estrutura `nfeProc/NFe/infNFe`, com **2 produtos**.     |
| `nfe-valida.pdf`                      | PDF simulando um DANFE, com chave de 44 dígitos, CNPJ e 2 produtos.  |
| `nfe-invalida.xml`                    | XML malformado/incompleto, para testar tratamento de erro.          |
| `nao-permitido.txt`                   | Arquivo `.txt`, para testar rejeição de formato não permitido.      |
| `zip-vazio.zip`                       | ZIP vazio (sem nenhuma entrada), para testar validação de ZIP vazio.|
| `documentos-validos.zip`              | ZIP contendo `nfe-valida.xml` + `nfe-valida.pdf` (processamento ok). |
| `documentos-invalido-formato.zip`     | ZIP contendo `nao-permitido.txt` + `nfe-valida.xml` (formato misto). |

> **Atenção:** como a chave de acesso possui `unique: true` no MongoDB, reenviar o
> mesmo `nfe-valida.xml`/`nfe-valida.pdf` duas vezes fará a segunda tentativa
> retornar erro de **NF-e duplicada** — isso é esperado e faz parte do teste.

## Como montar um ZIP de teste manualmente

Caso queira montar seus próprios pacotes ZIP de teste:

1. Coloque em uma pasta local apenas arquivos `.xml` e/ou `.pdf` (outros formatos
   dentro do ZIP são rejeitados individualmente pela API).
2. Compacte o conteúdo da pasta (não a pasta em si) para evitar diretórios na raiz:
   - Linux/Mac: `zip -j meu-pacote.zip arquivo1.xml arquivo2.pdf`
   - Windows: selecione os arquivos → botão direito → "Enviar para" → "Pasta compactada".
3. Para testar um ZIP vazio, crie um arquivo `.zip` sem nenhuma entrada
   (ex.: `zip -X vazio.zip` em um diretório vazio, ou use o `zip-vazio.zip` já incluído).
4. Para testar formato não permitido dentro do ZIP, inclua um `.txt`, `.docx` etc.
   junto dos arquivos `.xml`/`.pdf` — o resultado retornará erro apenas para essa
   entrada específica, mantendo o processamento dos demais arquivos do pacote.

## Testando com `curl`

```bash
curl -X POST http://localhost:3333/api/documents/upload \
  -F "files=@tests/nfe-valida.xml" \
  -F "files=@tests/nfe-valida.pdf"
```

```bash
curl -X POST http://localhost:3333/api/documents/upload \
  -F "files=@tests/documentos-validos.zip"
```

```bash
curl -X POST http://localhost:3333/api/documents/upload \
  -F "files=@tests/zip-vazio.zip"
```
