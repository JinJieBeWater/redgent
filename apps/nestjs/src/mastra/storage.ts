import { PostgresStore } from '@mastra/pg'
import { Memory } from '@mastra/memory'

export const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
})

export const memory = new Memory({
  storage: storage,
})
