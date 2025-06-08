import { myProvider } from './providers'

export function getAI() {
  return myProvider.languageModel('chat-model')
} 
