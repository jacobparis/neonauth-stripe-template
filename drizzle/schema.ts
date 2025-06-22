import { text, boolean, pgTable, serial, timestamp, integer, pgPolicy, varchar, pgSchema } from "drizzle-orm/pg-core"
import { relations, sql } from "drizzle-orm"

// Define the neon_auth schema
const neonAuthSchema = pgSchema("neon_auth")

// Define the neon_auth schema users_sync table
export const users_sync = neonAuthSchema.table("users_sync", {
  id: varchar("id", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
})

export const todos = pgTable("todos", {
  id: varchar("id", { length: 255 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  dueDate: timestamp("due_date"),
  userId: varchar("user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
})

export const comments = pgTable("comments", {
  id: varchar("id", { length: 255 }).primaryKey(),
  content: text("content").notNull(),
  todoId: varchar("todo_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const activities = pgTable("activities", {
  id: varchar("id", { length: 255 }).primaryKey(),
  content: text("content").notNull(),
  todoId: varchar("todo_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Define relations
export const usersRelations = relations(users_sync, ({ many }) => ({
  comments: many(comments, { relationName: "userComments" }),
  todos: many(todos, { relationName: "userTodos" }),
}))

export const todosRelations = relations(todos, ({ many, one }) => ({
  comments: many(comments, { relationName: "todoComments" }),
  user: one(users_sync, {
    fields: [todos.userId],
    references: [users_sync.id],
    relationName: "userTodos",
  }),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  todo: one(todos, {
    fields: [activities.todoId],
    references: [todos.id],
    relationName: "todoActivities",
  }),
  user: one(users_sync, {
    fields: [activities.userId],
    references: [users_sync.id],
    relationName: "userActivities",
  }),
}))

// Types for use in the application
export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
export type User = typeof users_sync.$inferSelect
export type NewUser = typeof users_sync.$inferInsert
export type Comment = typeof comments.$inferSelect
export type NewComment = typeof comments.$inferInsert
