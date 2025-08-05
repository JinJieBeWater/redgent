import { mockDeep } from 'vitest-mock-extended'

import { PrismaClient } from '@redgent/db'

export const createMockContext = () => {
  return {
    prisma: mockDeep<PrismaClient>(),
  }
}

export type MockedContext = ReturnType<typeof createMockContext>
