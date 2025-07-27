import { Mocked } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'

import { PrismaClient } from '@redgent/db'

export type Context = {
  prisma: PrismaClient
}

export type MockContext = {
  prisma: Mocked<PrismaClient>
}

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  }
}
