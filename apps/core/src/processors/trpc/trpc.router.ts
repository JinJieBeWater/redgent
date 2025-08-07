import { ReportRouter } from '@core/modules/report/report.router'
import { TaskExecutionRouter } from '@core/modules/task-execution/task-execution.router'
import { TaskRouter } from '@core/modules/task/task.router'
import { INestApplication, Injectable } from '@nestjs/common'
import * as trpcExpress from '@trpc/server/adapters/express'

import { createContext, TrpcService } from './trpc.service'

@Injectable()
export class TrpcRouter {
  private _router: ReturnType<typeof this.register>
  private _caller: ReturnType<typeof this.createCaller>
  constructor(
    private readonly trpcService: TrpcService,
    private readonly taskRouter: TaskRouter,
    private readonly reportRouter: ReportRouter,
    private readonly taskExecutionRouter: TaskExecutionRouter,
  ) {}

  register() {
    return this.trpcService.t.router({
      ...this.taskRouter.apply(),
      ...this.reportRouter.apply(),
      ...this.taskExecutionRouter.apply(),
    })
  }

  createCaller() {
    const { createCallerFactory } = this.trpcService.t
    const createCaller = createCallerFactory(this._router)
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

  get router() {
    return this._router
  }

  applyMiddleware(app: INestApplication) {
    if (!this._router) {
      this._router = this.register()
    }
    app.use(
      `/trpc`,
      trpcExpress.createExpressMiddleware({
        router: this._router,
        createContext,
      }),
    )
  }
}
