import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { connectDatabase } from "./config/database";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3333;

async function bootstrap() {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`[server] TCS Documentos API rodando na porta ${PORT}`);
    console.log(`[server] Health check: http://localhost:${PORT}/health`);
  });
}

bootstrap().catch((error) => {
  console.error("[server] Falha ao iniciar a aplicação:", error);
  process.exit(1);
});
