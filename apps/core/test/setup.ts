// import { vi } from 'vitest'

// vi.mock('@redgent/db', async importOriginal => {
//   const actual = await importOriginal<typeof import('@redgent/db')>()

//   return {
//     ...actual,
//     PrismaClient: vi.fn().mockImplementation(() => ({
//       $connect: vi.fn(),
//       $disconnect: vi.fn(),
//     })),
//   }
// })
