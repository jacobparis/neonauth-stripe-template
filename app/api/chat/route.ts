import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { stackServerApp } from '@/stack'
import { myProvider } from '@/lib/ai/providers'
import { systemPrompt } from '@/lib/ai/prompts'
import { 
  updateTodoTitle, 
  updateTodoDescription, 
  updateTodoDueDate, 
  toggleTodoCompletion, 
  assignTodo 
} from '@/lib/ai/tools/todo-actions'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { messages, todoId, todoContext } = await req.json()

    const user = await stackServerApp.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Enhanced system prompt with todo context and capabilities
    const todoSystemPrompt = `${systemPrompt()}

Current Todo Context:
- Todo ID: ${todoId}
- Title: "${todoContext.title}"
- Description: ${todoContext.description || 'No description'}

You can help users manage this specific todo by:
1. Updating the title or description
2. Setting or changing due dates
3. Marking as complete/incomplete
4. Assigning to users
5. Providing productivity advice

When users ask you to make changes to the todo, use the appropriate tools to actually modify it.
Be conversational and helpful - act like a smart assistant that can both chat and take action.

Example interactions:
- "Change the title to 'X'" → Use updateTodoTitle
- "Mark this as done" → Use toggleTodoCompletion
- "Set due date to next Friday" → Use updateTodoDueDate
- "This needs more details" → Ask what to add, then use updateTodoDescription
`

    const result = streamText({
      model: myProvider.languageModel('chat-model'),
      system: todoSystemPrompt,
      messages,
      maxSteps: 5,
      tools: {
        updateTodoTitle,
        updateTodoDescription,
        updateTodoDueDate,
        toggleTodoCompletion,
        assignTodo,
      },
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 
