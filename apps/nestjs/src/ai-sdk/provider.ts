import type {
  EmbeddingModel,
  ImageModel,
  Provider,
  SpeechModel,
  TranscriptionModel,
} from 'ai'
import { createOpenRouter, LanguageModelV2 } from '@openrouter/ai-sdk-provider'
import { customProvider } from 'ai'

import { chatModel, structureModel } from './models.test'

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export const myProvider: Provider & {
  languageModel(modelId: 'chat-model' | 'structure-model'): LanguageModelV2
  textEmbeddingModel(modelId: string): EmbeddingModel<string>
  imageModel(modelId: string): ImageModel
  transcriptionModel(modelId: string): TranscriptionModel
  speechModel(modelId: string): SpeechModel
} =
  process.env.NODE_ENV === 'test'
    ? customProvider({
        languageModels: {
          'chat-model': chatModel,
          'structure-model': structureModel,
        },
      })
    : customProvider({
        languageModels: {
          'chat-model': openRouter('deepseek/deepseek-chat-v3-0324'),
          'structure-model': openRouter(
            'google/gemini-2.5-flash-lite-preview-06-17',
          ),
        },
      })
