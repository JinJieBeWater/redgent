import type { AppMessage } from '@core/shared'
import { createContext, useContext } from 'react'
import { useChat } from '@ai-sdk/react'

export type ChatContextType = ReturnType<typeof useChat<AppMessage>>
export const ChatContext = createContext<ChatContextType | undefined>(undefined)

export const ChatContextProvider = ChatContext.Provider

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageContextProvider')
  }
  return context
}
