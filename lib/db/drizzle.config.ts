import type { Config } from "drizzle-kit"
import { loadEnvConfig } from "@next/env"

// Load environment variables from .env file
loadEnvConfig(process.cwd())

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required")
}

// Parse database URL
const url = new URL(process.env.DATABASE_URL)
const ssl = url.searchParams.get("sslmode") === "require"

export default {
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: ssl || true,
  },
} satisfies Config
