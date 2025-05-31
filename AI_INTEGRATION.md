# AI Chatbot Integration

This integration adds AI assistant functionality to the todo app's activity section, allowing users to chat with an AI agent about their tasks **and take direct actions**.

## Features

- **Unified Activity Feed**: Combines regular comments and AI conversations in one interface
- **Context-Aware AI**: The AI assistant has access to task details (title, description)
- **Real-time Streaming**: Uses streaming responses for smooth user experience
- **Smart Message Routing**: Automatically detects AI requests vs regular comments
- **🚀 ACTIONABLE AI**: AI can directly modify the current todo using tools

## AI Tools & Actions

The AI assistant can take these direct actions on the current todo:

### **Todo Modification Tools**

- `updateTodoTitle` - Change the todo title
- `updateTodoDescription` - Update the description
- `updateTodoDueDate` - Set, change, or remove due dates
- `toggleTodoCompletion` - Mark as complete/incomplete
- `assignTodo` - Assign to team members or unassign

### **Example Interactions**

```
User: "Change the title to 'Review Q4 metrics'"
AI: Updates title → "I've updated the todo title to 'Review Q4 metrics'"

User: "Mark this as done"
AI: Toggles completion → "Great! I've marked this todo as completed"

User: "Set due date to next Friday"
AI: Updates due date → "I've set the due date to December 15th, 2024"

User: "This needs more details about the requirements"
AI: "What specific requirements should I add to the description?"
```

## Components

### API Route (`app/api/chat/route.ts`)

- Handles AI conversations using the Vercel AI SDK
- Integrates with xAI's Grok models
- **NEW**: Includes todo manipulation tools
- Provides enhanced context with current todo details

### Activity Chat Component (`app/app/todos/[id]/activity-chat.tsx`)

- Unified interface for comments and AI chat
- Smart routing: detects AI requests automatically
- Real-time streaming AI responses with tool execution
- Optimistic updates for smooth UX

### Todo Action Tools (`lib/ai/tools/todo-actions.ts`)

- **NEW**: Complete set of todo manipulation tools
- Database integration with proper error handling
- Notification system integration
- Revalidation for real-time UI updates

## Setup

1. **Environment Variables**
   Add to your `.env.local`:

   ```
   XAI_API_KEY=your-xai-api-key
   ```

2. **Dependencies**
   Already installed:
   - `@ai-sdk/react`
   - `@ai-sdk/xai`
   - `ai`

## Usage

1. Navigate to any todo detail page
2. In the activity section, type naturally:
   - Regular comments: `"Looking good so far"`
   - AI assistance: `"@ai help me break this down"` or `"change the title to X"`
3. The AI will either respond with advice or take direct action

## Smart Message Detection

The system automatically routes messages:

**Triggers AI Response:**

- `@ai` - Direct mention
- `help`, `suggest`, `how can`, `what should` - Seeking advice
- `change`, `update`, `set`, `mark` - Action requests

**Triggers Direct Actions:**

- `"Change title to..."` → Updates title
- `"Mark as done"` → Toggles completion
- `"Set due date to..."` → Updates due date
- `"Add description..."` → Updates description

## AI Capabilities

The AI assistant can help with:

- **Actions**: Directly modify todo properties
- **Planning**: Breaking down complex tasks into smaller steps
- **Scheduling**: Setting realistic priorities and deadlines
- **Optimization**: Providing task completion suggestions
- **Strategy**: General productivity advice
- **Context**: Task-specific guidance based on current details

## Integration Points

- **Authentication**: Uses Stack Auth for user context
- **Database**: Direct integration with Drizzle ORM
- **Notifications**: Notifies watchers of AI actions
- **Real-time Updates**: Live UI updates via revalidation
- **Error Handling**: Graceful fallbacks for failed actions
- **UI**: Integrates with shadcn/ui components
