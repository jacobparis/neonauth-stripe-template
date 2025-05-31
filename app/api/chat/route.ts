import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { stackServerApp } from '@/stack'
import { myProvider } from '@/lib/ai/providers'
import { systemPrompt } from '@/lib/ai/prompts'
import { getTodo, getUsersWithProfiles } from '@/lib/actions'
import { format } from 'date-fns'
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

    // Fetch full todo details and users for richer context
    const [todo, users] = await Promise.all([
      getTodo(todoId),
      getUsersWithProfiles(),
    ])

    if (!todo) {
      return new Response('Todo not found', { status: 404 })
    }

    // Find assigned user details
    const assignedUser = todo.assignedToId 
      ? users.find(u => u.id === todo.assignedToId)
      : null

    // Format due date
    const dueDateStr = todo.dueDate 
      ? format(new Date(todo.dueDate), 'PPP')
      : 'No due date set'

    // Enhanced system prompt with full todo context
    const todoSystemPrompt = `${systemPrompt()}

CURRENT TODO DETAILS:
- ID: ${todoId}
- Title: "${todo.title}"
- Description: ${todo.description || 'No description'}
- Status: ${todo.completed ? 'COMPLETED ✅' : 'In Progress 🔄'}
- Due Date: ${dueDateStr}
- Assigned To: ${assignedUser ? `${assignedUser.name || assignedUser.email} (${assignedUser.id})` : 'Unassigned'}
- Created: ${format(new Date(todo.createdAt), 'PPP')}
- Last Updated: ${format(new Date(todo.updatedAt), 'PPP')}

AVAILABLE TEAM MEMBERS:
${users.map(u => `- ${u.name || u.email} (ID: ${u.id})`).join('\n')}

CAPABILITIES:
You have full context of this todo and its history. You can:
1. Update title or description
2. Set, change, or clear due dates
3. Mark as complete/incomplete
4. Assign to team members
5. Provide productivity advice and suggestions
6. Answer questions about the task

INSTRUCTIONS:
- Be proactive in suggesting improvements
- When users ask for changes, use the appropriate tools immediately
- Reference the current state when providing context
- Be conversational and helpful
- If assigning to users, use their exact ID from the team members list above

The conversation history below includes previous comments and activity related to this todo.
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
