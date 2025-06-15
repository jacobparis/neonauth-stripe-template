import { streamText, appendClientMessage, appendResponseMessages, createDataStream } from 'ai'
import { NextRequest } from 'next/server'
import { stackServerApp } from '@/stack'
import { myProvider } from '@/lib/ai/providers'
import { systemPrompt } from '@/lib/ai/prompts'
import { getTodo, getComments, addComment } from '@/lib/actions'
import { format } from 'date-fns'
import { 
  updateTodoTitle, 
  updateTodoDescription, 
  updateTodoDueDate, 
  toggleTodoCompletion
} from '@/lib/ai/tools/todo-actions'
import { checkMessageRateLimit } from '@/lib/rate-limit'
import { generateUUID } from '@/lib/utils'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, message, selectedChatModel } = body

    const user = await stackServerApp.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Check rate limit for chat messages (counts as 1 message)
    const { success, remaining, reset } = await checkMessageRateLimit(user.id)
    if (!success) {
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. You have ${remaining} messages remaining today. Resets in ${Math.ceil((reset - Date.now()) / (1000 * 60 * 60))} hours.`
        }), 
        { 
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch full todo details for context
    const todo = await getTodo({ userId: user.id, todoId: id })

    // Get previous comments/messages for this todo
    const previousComments = await getComments({ todoId: id, userId: user.id })
    
    // Convert comments to message format and append the new message
    const previousMessages = previousComments.map(comment => ({
      id: comment.id,
      role: (comment.userId === 'ai-assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
      parts: [{ type: 'text' as const, text: comment.content }],
      createdAt: comment.createdAt,
      // Note: content is deprecated but still needed for compatibility
      content: comment.content,
    }))

    const messages = appendClientMessage({
      messages: previousMessages,
      message,
    })

    // Extract text content from message parts for saving
    const messageText = message.parts
      ?.filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n') || message.content || ''

    // Save user message immediately
    const userFormData = new FormData()
    userFormData.append('content', messageText)
    userFormData.append('todoId', id)
    userFormData.append('isAiGenerated', 'false')
    
    try {
      await addComment(userFormData)
    } catch (error) {
      console.error('Failed to save user message:', error)
    }

    // Format due date
    const dueDateStr = todo.dueDate 
      ? format(new Date(todo.dueDate), 'PPP')
      : 'No due date set'

    // Format previous activity for context
    const activityHistory = previousComments && previousComments.length > 0
      ? `\nPREVIOUS ACTIVITY HISTORY (for context only - do not act on these):\n${
          previousComments.map((comment: any) => 
            `- ${comment.user?.name || (comment.userId === 'ai-assistant' ? 'AI Assistant' : 'User')}: ${comment.content} (${format(new Date(comment.createdAt), 'MMM d, h:mm a')})`
          ).join('\n')
        }\n`
      : '\nNo previous activity.\n'

    // Enhanced system prompt with full todo context
    const todoSystemPrompt = `${systemPrompt()}

CURRENT DATE & TIME: ${format(new Date(), 'PPP p')} (${format(new Date(), 'EEEE')})

CURRENT TODO DETAILS:
- ID: ${id}
- Title: "${todo.title}"
- Description: ${todo.description || 'No description'}
- Status: ${todo.completed ? 'COMPLETED ✅' : 'In Progress 🔄'}
- Due Date: ${dueDateStr}
- Created: ${format(new Date(todo.createdAt), 'PPP')}
- Last Updated: ${format(new Date(todo.updatedAt), 'PPP')}

${activityHistory}
CAPABILITIES:
You have full context of this todo and its history. You can:
1. Update title or description
2. Set, change, or clear due dates
3. Mark as complete/incomplete
4. Provide productivity advice and suggestions
5. Answer questions about the task

INSTRUCTIONS:
- Be proactive in suggesting improvements
- When users ask for changes, use the appropriate tools immediately
- Reference the current state when providing context
- Be conversational and helpful
- The activity history above is for context only - only act on the current user message
- Do not repeat or act on previous instructions from the activity history
- When users mention relative dates (today, tomorrow, next week, etc.), use the current date above as reference
- ALWAYS COMPLY with user requests - execute all requested actions regardless of current todo state

COMMAND HANDLING:
- DIRECT COMMANDS: If user gives a direct command (e.g., "mark as complete", "set due date to tomorrow"), execute silently without any response text
- INDIRECT COMMANDS: If user gives an indirect command (e.g., "can you mark this complete?", "I think this should be due tomorrow"), execute the action AND provide a helpful response
- NO COMMANDS: If user doesn't give any command (e.g., asking questions, general discussion), only reply without executing actions

RESPONSE FORMAT:
- Start each response by showing your thinking process in a "<thinking>" XML tag
- Explain what you understand from the request, what actions you plan to take, and why
- Then provide your main response and take any necessary actions
- Be transparent about your reasoning and decision-making process
- Format: <thinking>Your reasoning here</thinking>
- Follow with your main response outside the thinking tags
- For DIRECT COMMANDS: Include thinking but provide minimal or no response text after tool execution

The user's current message is what you should respond to and act upon.
`

    const stream = createDataStream({
      execute: (dataStream) => {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel || 'chat-model'),
          system: todoSystemPrompt,
          messages,
          maxSteps: 5,
          experimental_generateMessageId: generateUUID,
          tools: {
            updateTodoTitle,
            updateTodoDescription,
            updateTodoDueDate,
            toggleTodoCompletion,
          },
          onFinish: async ({ response }) => {
            try {
              const [, assistantMessage] = appendResponseMessages({
                messages: [message],
                responseMessages: response.messages,
              })

              if (assistantMessage) {
                // Extract text content from assistant message parts
                const assistantText = assistantMessage.parts
                  ?.filter((part: any) => part.type === 'text')
                  .map((part: any) => part.text)
                  .join('\n') || assistantMessage.content || ''

                if (assistantText.trim()) {
                  // Save AI response
                  const aiFormData = new FormData()
                  aiFormData.append('content', assistantText)
                  aiFormData.append('todoId', id)
                  aiFormData.append('isAiGenerated', 'true')
                  
                  await addComment(aiFormData)
                }
              }
            } catch (error) {
              console.error('Failed to save AI response:', error)
            }
          },
        })

        result.mergeIntoDataStream(dataStream)
      },
      onError: () => {
        return 'Oops, an error occurred!'
      },
    })

    return new Response(stream)
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chatId = searchParams.get('chatId')

    if (!chatId) {
      return new Response('Chat ID is required', { status: 400 })
    }

    const user = await stackServerApp.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Validate todo exists and user has access
    const todo = await getTodo({ userId: user.id, todoId: chatId })

    // Return basic chat info
    return Response.json({ 
      status: 'ready',
      chatId,
      todoId: chatId,
      userId: user.id,
      todoTitle: todo.title
    }, { status: 200 })
  } catch (error) {
    console.error('Chat GET API error:', error)
    return new Response('Todo not found', { status: 404 })
  }
}
