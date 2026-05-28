import "dotenv/config";

import { defineConfig, env } from "prisma/config";

// Prisma 7 separa la config de CLI/Migrate (este archivo) del runtime del
// PrismaClient (src/server/db.ts, que usa @prisma/adapter-pg).
//
// Aquí solo declaramos lo que necesita migrate/db push/studio.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
