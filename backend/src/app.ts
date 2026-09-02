import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import documentsRoutes from "./routes/documents.routes";
import { AppError } from "./errors/AppError";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "tcs-documentos-backend" });
});

app.use("/api/documents", documentsRoutes);

// Rota não encontrada
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Middleware global de tratamento de erros
app.use(
  (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }

    console.error("[app] Erro não tratado:", err);
    return res.status(500).json({
      message: "Erro interno do servidor. Falha de comunicação ou processamento inesperado.",
    });
  }
);

export default app;
