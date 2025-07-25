import { createDeepSeek } from '@ai-sdk/deepseek'
// import { createOpenRouter} from '@openrouter/ai-sdk-provider'
import { customProvider } from 'ai'

import { analysisModel, chatModel, structureModel } from './models.test'

// const openRouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY,
// })

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
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
          'chat-model': deepseek.chat('deepseek-chat'),
          'structure-model': deepseek.chat('deepseek-chat'),
          'analysis-model': deepseek.chat('deepseek-chat'),
        },
      })
