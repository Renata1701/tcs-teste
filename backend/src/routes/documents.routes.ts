import { Router, Request, Response, NextFunction } from "express";
import multer, { FileFilterCallback } from "multer";
import { AppError } from "../errors/AppError";
import { processUpload, listarNFes } from "../services/document.service";

const router = Router();

const EXTENSOES_PERMITIDAS = [".xml", ".pdf", ".zip"];
const LIMITE_ARQUIVOS = 20;
const LIMITE_TAMANHO_MB = 20;

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) {
  const nome = file.originalname.toLowerCase();
  const permitido = EXTENSOES_PERMITIDAS.some((ext) => nome.endsWith(ext));

  if (!permitido) {
    // Rejeita silenciosamente aqui; o motivo detalhado é reportado
    // por arquivo na camada de serviço via multer.any() abaixo não se aplica,
    // então sinalizamos erro explícito para interromper o upload deste arquivo.
    return callback(
      new AppError(
        `Formato de arquivo não permitido: "${file.originalname}". Formatos aceitos: .xml, .pdf, .zip.`,
        415
      ) as unknown as Error
    );
  }

  callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: LIMITE_ARQUIVOS,
    fileSize: LIMITE_TAMANHO_MB * 1024 * 1024,
  },
  fileFilter,
});

router.post(
  "/upload",
  (req: Request, res: Response, next: NextFunction) => {
    upload.array("files", LIMITE_ARQUIVOS)(req, res, (err: any) => {
      if (err) {
        if (err instanceof AppError) return next(err);

        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError(
              `Arquivo excede o limite de ${LIMITE_TAMANHO_MB}MB.`,
              413
            )
          );
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return next(
            new AppError(
              `Quantidade de arquivos excede o limite de ${LIMITE_ARQUIVOS}.`,
              413
            )
          );
        }
        return next(
          new AppError(`Falha ao receber os arquivos: ${err.message}`, 400)
        );
      }
      next();
    });
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const arquivos = (req.files as Express.Multer.File[]) ?? [];

      if (!arquivos.length) {
        throw new AppError("Nenhum arquivo enviado.", 400);
      }

      const resultados = await processUpload(
        arquivos.map((f) => ({
          originalname: f.originalname,
          buffer: f.buffer,
          mimetype: f.mimetype,
          size: f.size,
        }))
      );

      return res.status(200).json({ resultados });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const listagem = await listarNFes(page, limit);
    return res.status(200).json(listagem);
  } catch (error) {
    next(error);
  }
});

export default router;
