import path from "node:path";
import { config } from "dotenv-safe";

// Load environment variables from `.env` using dotenv-safe.
// `.env.example` ensures required variables are defined.
config({
  allowEmptyValues: false,
  example: path.resolve(process.cwd(), ".env.example"),
});
