import mongoose from "mongoose";
import { mascararMongoUri } from "../utils/mongoUri";

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI não definida. Verifique o arquivo .env (veja .env.example)."
    );
  }

  try {
    await mongoose.connect(uri);
    console.log(`[database] Conectado ao MongoDB em ${mascararMongoUri(uri)}`);
  } catch (error) {
    console.error("[database] Falha ao conectar ao MongoDB:", error);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[database] Erro de conexão com o MongoDB:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[database] Conexão com o MongoDB foi encerrada.");
  });
}
