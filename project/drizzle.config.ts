// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

// Resolve .env path relative to THIS file (no cwd surprises)
const here = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(here, ".env");

console.log("[DRIZZLE] drizzle.config at:", here);
console.log("[DRIZZLE] loading .env from:", envPath, "exists?", fs.existsSync(envPath));

dotenv.config({ path: envPath });

console.log("[DRIZZLE] has DATABASE_URL?", !!process.env.DATABASE_URL);

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(`DATABASE_URL missing in ${envPath}`);
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
