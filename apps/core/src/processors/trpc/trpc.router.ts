import { ReportRouter } from '@core/modules/report/report.router'
import { INestApplication, Injectable } from '@nestjs/common'
import * as trpcExpress from '@trpc/server/adapters/express'

import { createContext, TrpcService } from './trpc.service'

@Injectable()
export class TrpcRouter {
  appTrpcRouter: ReturnType<typeof this.register>
  constructor(
    private readonly trpcService: TrpcService,
    private readonly reportRouter: ReportRouter,
  ) {
    this.appTrpcRouter = this.register()
  }

  register() {
    return this.trpcService.t.router({
      ...this.reportRouter.apply(),
    })
  }

  applyMiddleware(app: INestApplication) {
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({
        router: this.appTrpcRouter,
        createContext,
      }),
    )
  }
}

export type AppRouter = TrpcRouter[`appTrpcRouter`]
