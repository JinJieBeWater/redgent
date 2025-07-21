import { createOpenRouter, LanguageModelV2 } from '@openrouter/ai-sdk-provider'
import { customProvider } from 'ai'

import { analysisModel, chatModel, structureModel } from './models.test'

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export const myProvider =
  process.env.NODE_ENV === 'test'
    ? customProvider({
        languageModels: {
          'chat-model': chatModel,
          'structure-model': structureModel,
          'analysis-model': analysisModel,
        },
      })
    : customProvider({
        languageModels: {
          'chat-model': openRouter('deepseek/deepseek-chat-v3-0324'),
          'structure-model': openRouter(
            'google/gemini-2.5-flash-lite-preview-06-17',
          ),
          'analysis-model': openRouter('google/gemini-2.0-flash-001'),
        },
      })
