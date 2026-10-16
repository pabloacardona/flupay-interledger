import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Local: .env.local (pulled from Vercel: Neon URLs and app secrets).
config({ path: [".env.local", "../../.env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "" },
});
