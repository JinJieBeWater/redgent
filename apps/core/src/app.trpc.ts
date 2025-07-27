import { TrpcRouter } from './common/decorators/trpc-router.decorator'
import { ITrpcRouter } from './processors/trpc/trpc-router.interface'
import { TrpcService } from './processors/trpc/trpc.service'

@TrpcRouter('app')
export class AppTrpcRouter implements ITrpcRouter {
  router!: ReturnType<typeof this.createRouter>
  constructor(private readonly trpcService: TrpcService) {}

  onModuleInit() {
    this.router = this.createRouter()
  }

  private createRouter() {
    const t = this.trpcService.t
    return t.router({
      hello: t.procedure.query(() => {
        return 'hello world'
      }),
    })
  }
}
