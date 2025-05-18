import { text, boolean, pgTable, serial, timestamp, integer, pgPolicy, varchar } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import type { z } from "zod"

// Define the neon_auth schema users_sync table
export const users_sync = pgTable("users_sync", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  image: varchar("image", { length: 1024 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
})

// Separate table to track user metrics
export const user_metrics = pgTable("user_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  todosCreated: integer("todos_created").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const todos = pgTable(
  "todos",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    completed: boolean("completed").default(false).notNull(),
    dueDate: timestamp("due_date"),
    projectId: integer("project_id"),
    assignedToId: varchar("assigned_to_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  ({}) => ({
    p1: pgPolicy("view todos", {
      for: "select",
      to: "authenticated",
      using: sql`auth.user_id() = assigned_to_id`,
    }),

    p2: pgPolicy("update todos", {
      for: "update",
      to: "authenticated",
      using: sql`auth.user_id() = assigned_to_id`,
    }),

    p3: pgPolicy("delete todos", {
      for: "delete",
      to: "authenticated",
      using: sql`auth.user_id() = assigned_to_id`,
    }),
  }),
)

// Define relations
export const projectsRelations = relations(projects, ({ many }) => ({
  todos: many(todos),
}))

export const usersRelations = relations(users_sync, ({ many }) => ({
  assignedTodos: many(todos, { relationName: "assignedTodos" }),
  metrics: many(user_metrics, { relationName: "metrics" }),
}))

export const userMetricsRelations = relations(user_metrics, ({ one }) => ({
  user: one(users_sync, {
    fields: [user_metrics.userId],
    references: [users_sync.id],
    relationName: "metrics",
  }),
}))

export const todosRelations = relations(todos, ({ one }) => ({
  project: one(projects, {
    fields: [todos.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users_sync, {
    fields: [todos.assignedToId],
    references: [users_sync.id],
  }),
}))

// Create schemas for type validation with Zod
export const insertTodoSchema = createInsertSchema(todos)
export const selectTodoSchema = createSelectSchema(todos)

// Types for use in the application
export type Todo = z.infer<typeof selectTodoSchema>
export type NewTodo = z.infer<typeof insertTodoSchema>
\
export type Project = z.infer<typeof createSelectSchema(projects)>
\
export type User = z.infer<typeof createSelectSchema(users_sync)>
export type UserMetrics = typeof user_metrics.$inferSelect
export type NewUserMetrics = typeof user_metrics.$inferInsert
