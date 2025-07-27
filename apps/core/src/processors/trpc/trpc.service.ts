import { INestApplication, Injectable, Logger } from '@nestjs/common'
import { DiscoveryService, Reflector } from '@nestjs/core'
import * as trpcExpress from '@trpc/server/adapters/express'

import { BaseTrpcRouter } from '../../common/decorators/trpc-router.decorator'
import { createContext, t } from './trpc.instance'

@Injectable()
export class TrpcService {
  private readonly logger = new Logger(TrpcService.name)
  private appRouter!: ReturnType<typeof this.createAppRouter>
  constructor(private readonly discoveryService: DiscoveryService) {
    // this._procedureAuth = Trpc.procedure.use(
    //   // 这里我们也定义身份验证的 procedure
    //   Trpc.middleware(async opts => {
    //     const authorization = opts.ctx.authorization
    //     if (!authorization) {
    //       throw new BizException(ErrorCodeEnum.AuthFail)
    //     }

    //     const result = await authService.validate(authorization)
    //     if (result !== true) {
    //       throw new BizException(result)
    //     }
    //     return opts.next()
    //   }),
    // )
    this.createAppRouter()
  }

  public get t() {
    return t
  }

  // private _procedureAuth: typeof Trpc.procedure

  // public get procedureAuth() {
  //   return this._procedureAuth
  // }

  private createAppRouter() {
    const p = this.discoveryService.getProviders()
    const routers = p
      .filter(item =>
        this.discoveryService.getMetadataByDecorator(BaseTrpcRouter, item),
      )
      .map(({ instance }) => instance.router)
      .filter(router => {
        if (!router) {
          this.logger.warn('missing router.')
        }
        return !!router
      })

    const appRouter = t.mergeRouters(...(routers as any))
    this.appRouter = appRouter
    return appRouter
  }

  applyMiddleware(app: INestApplication) {
    this.logger.log('Applying tRPC middleware to the app...')
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({
        router: this.appRouter,
        createContext,
      }),
    )
  }
}
