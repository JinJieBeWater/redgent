import { Memory } from '@mastra/memory'
import { PostgresStore } from '@mastra/pg'

export const storage = new PostgresStore({
  connectionString: process.env.DATABASE_URL!,
})

export const memory = new Memory({
  storage: storage,
})
