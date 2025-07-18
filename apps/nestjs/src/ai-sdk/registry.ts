import { createOpenRouter } from '@openrouter/ai-sdk-provider'

import { createProviderRegistry } from 'ai'

export const registry = createProviderRegistry({
  // register provider with prefix and custom setup:
  openrouter: {
    ...createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    }),
    textEmbeddingModel: () => {
      throw new Error('OpenRouter does not support text embeddings')
    },
  } as unknown as Parameters<typeof createProviderRegistry>[0]['openrouter'],
})
