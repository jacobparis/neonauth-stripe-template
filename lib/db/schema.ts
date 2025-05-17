import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

// Create the issues table schema
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  issue_number: serial("issue_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
})

// Define relations
export const issuesRelations = relations(issues, ({ one }) => ({
  // Relations would go here
}))

// Create schemas for type validation with Zod
export const insertIssueSchema = createInsertSchema(issues)
export const selectIssueSchema = createSelectSchema(issues)

// Types for use in the application
export type Issue = z.infer<typeof selectIssueSchema>
export type NewIssue = z.infer<typeof insertIssueSchema>

// Initialize Neon client with HTTP
const sql = neon(process.env.DATABASE_URL!)

// Initialize Drizzle with the Neon HTTP connection
export const db = drizzle(sql)
