import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Conexão usada pelo Prisma Migrate (CLI). O runtime (PrismaClient) usa
    // o driver adapter — ver src/prisma/prisma.service.ts.
    url: env("DATABASE_URL"),
  },
});
