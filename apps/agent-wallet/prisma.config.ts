import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Local: root .env (Open Payments) and .env.local (pulled from Vercel: Neon URLs).
config({ path: ["../../.env.local", "../../.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations use the direct (non-pooled) connection.
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
