import { processDeleteTodos } from "@/actions/delete-todos"
import { generateTodoDescription } from "@/actions/generate-description"

export type QueueTask = 
  | { type: "deleteTodo"; key: `delete-todo-${string}`; id: string }
  | { type: "deleteTodos"; key: `delete-todos-${string}`; ids: string[]; userId: string }
  | { type: "generateDescription"; key: `generate-description-${string}`; todoId: string; title: string; userId: string }

export async function processTask(task: QueueTask) {
  try {
    switch (task.type) {
      case "deleteTodos":
        await processDeleteTodos({ ids: task.ids, userId: task.userId })
        break
      case "generateDescription":
        await generateTodoDescription({ todoId: task.todoId, title: task.title, userId: task.userId })
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
