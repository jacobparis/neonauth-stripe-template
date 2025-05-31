import { createXai } from '@ai-sdk/xai'

export const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
})

export const myProvider = {
  languageModel: (modelId: string) => {
    switch (modelId) {
      case 'chat-model':
        return xai('grok-2-vision-1212')
      case 'chat-model-reasoning':
        return xai('grok-3-mini-beta')
      case 'title-model':
        return xai('grok-2-1212')
      default:
        return xai('grok-2-vision-1212')
    }
  },
} 
