import { mockDeep } from 'jest-mock-extended'
import { DeepMockProxy } from 'jest-mock-extended/lib/Mock'

import { PrismaClient } from '@redgent/db'

export type Context = {
  prisma: PrismaClient
}

export type MockContext = {
  prisma: DeepMockProxy<PrismaClient>
}

export const createMockContext = (): MockContext => {
  return {
    prisma: mockDeep<PrismaClient>(),
  }
}
