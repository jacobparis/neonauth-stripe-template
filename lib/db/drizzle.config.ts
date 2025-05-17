import type { Config } from "drizzle-kit"
import { loadEnvConfig } from "@next/env"

// Load environment variables from .env file
loadEnvConfig(process.cwd())

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
} satisfies Config
