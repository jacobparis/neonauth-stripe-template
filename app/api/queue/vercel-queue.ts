import { processDeleteTodos } from "@/actions/delete-todos"
import { generateTodoDescription } from "@/actions/generate-description"

export type QueueTask = 
  | { type: "deleteTodo"; key: `delete-todo-${number}`; id: number }
  | { type: "deleteTodos"; key: `delete-todos-${string}`; ids: number[]; userId: string }
  | { type: "generateDescription"; key: `generate-description-${number}`; todoId: number; title: string; userId: string }

export async function processTask(task: QueueTask) {
  try {
    switch (task.type) {
      case "deleteTodos":
        await processDeleteTodos(task.ids, task.userId)
        break
      case "generateDescription":
        await generateTodoDescription(task.todoId, task.title, task.userId)
        break
      default: {
        throw new Error(`Unknown task type: ${task.type}`)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error processing task:", error)
    return { error: "Failed to process task" }
  }
}
