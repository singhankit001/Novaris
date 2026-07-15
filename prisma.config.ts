import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

if (!process.env.VERCEL) {
  config({ path: ".env.local" });
  config();
}

const prismaCliDatabaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: prismaCliDatabaseUrl ?? process.env.DATABASE_URL ?? "postgresql://dummy:dummy@dummy/dummy",
  },
});
