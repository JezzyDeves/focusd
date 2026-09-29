import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Load .env / .env.local the same way Next.js does.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // The CLI needs a direct (or session-pooler) connection for migrations; the app uses DATABASE_URL.
  datasource: { url: process.env.DIRECT_URL },
});
