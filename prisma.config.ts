import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI (migrate) memakai koneksi langsung; aplikasi memakai DATABASE_URL (pooler).
    url: process.env["DIRECT_URL"],
  },
});
