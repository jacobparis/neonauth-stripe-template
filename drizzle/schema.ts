import { text, boolean, pgTable, serial, timestamp, integer, pgPolicy, varchar } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Define the neon_auth schema users_sync table
export const users_sync = pgTable("users_sync", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
})

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  todoId: integer("todo_id").notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Define relations
export const usersRelations = relations(users_sync, ({ many }) => ({
  comments: many(comments, { relationName: "userComments" }),
}))

export const todosRelations = relations(todos, ({ many }) => ({
  comments: many(comments, { relationName: "todoComments" }),
}))

export const commentsRelations = relations(comments, ({ one }) => ({
  todo: one(todos, {
    fields: [comments.todoId],
    references: [todos.id],
    relationName: "todoComments",
  }),
  user: one(users_sync, {
    fields: [comments.userId],
    references: [users_sync.id],
    relationName: "userComments",
  }),
}))

// Types for use in the application
export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
export type User = typeof users_sync.$inferSelect
export type NewUser = typeof users_sync.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
