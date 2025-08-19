import path from "node:path";

/**
 * Загружает .env только в dev/test. В production ничего не делает.
 * Вызывать ПЕРЕД тем, как импортировать остальной код приложения.
 */
export async function preloadEnv(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    const { config } = await import("dotenv-safe");
    config({
      allowEmptyValues: false,
      example: path.resolve(process.cwd(), ".env.example"),
    });
  }
}
