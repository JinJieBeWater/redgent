import { ReportRouter } from '@core/modules/report/report.router'
import { TaskRouter } from '@core/modules/task/task.router'
import { INestApplication, Injectable } from '@nestjs/common'
import * as trpcExpress from '@trpc/server/adapters/express'

import { createContext, TrpcService } from './trpc.service'

@Injectable()
export class TrpcRouter {
  router: ReturnType<typeof this.register>
  _caller: ReturnType<typeof this.createCaller>
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskRouter: TaskRouter,
    private readonly reportRouter: ReportRouter,
  ) {}

  register() {
    return this.trpcService.t.router({
      ...this.taskRouter.apply(),
      ...this.reportRouter.apply(),
    })
  }

  createCaller() {
    const { createCallerFactory } = this.trpcService.t
    const createCaller = createCallerFactory(this.router)
    return createCaller({
      authorization: null,
    })
  }

  get caller() {
    if (!this._caller) {
      this._caller = this.createCaller()
    }
    return this._caller
  }

  applyMiddleware(app: INestApplication) {
    if (!this.router) {
      this.router = this.register()
    }
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({
        router: this.router,
        createContext,
      }),
    )
  }
}
