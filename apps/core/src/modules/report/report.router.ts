import { Inject } from '@nestjs/common'

import { TrpcRouter } from '../../processors/trpc/trpc.interface'
import { TrpcService } from '../../processors/trpc/trpc.service'

export class ReportRouter implements TrpcRouter {
  @Inject()
  private readonly trpcService: TrpcService

  apply() {
    return {
      report: this.trpcService.t.router({
        hello: this.trpcService.publicProcedure().query(async () => {
          return 'hello world'
        }),
      }),
    }
  }
}
