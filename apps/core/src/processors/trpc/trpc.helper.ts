import { t, tRpcRouterType } from '@core/processors/trpc/trpc.instance'

type ObjWithKey<T extends string, Value> = { [K in T]: Value }

export const defineTrpcRouter = <
  T extends string,
  P extends Parameters<tRpcRouterType>[0],
>(
  route: T,
  routes: P,
) => {
  const rpcRoute = t.router(routes)
  return t.router({
    [route]: rpcRoute,
  } as any as ObjWithKey<T, typeof rpcRoute>)
}
