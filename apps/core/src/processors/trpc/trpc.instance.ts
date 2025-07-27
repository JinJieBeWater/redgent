import { inferRouterInputs, inferRouterOutputs, initTRPC } from '@trpc/server'
import * as trpcExpress from '@trpc/server/adapters/express'

import { TrpcService } from './trpc.service'

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  return {
    authorization: req.headers.authorization as string | null,
  }
}
export type Context = Awaited<ReturnType<typeof createContext>>

export const t = initTRPC.context<Context>().create()

// ====== 以下的类型导出是为 Client 端侧使用的
export type tRpcRouterType = (typeof t)['router']
export type tRpcProcedure = (typeof t)['procedure']
export type tRpc$Config = typeof t._config

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

export type AppRouter = TrpcService['appRouter']
