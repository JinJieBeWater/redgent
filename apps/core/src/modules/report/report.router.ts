import { TrpcRouter } from '@core/processors/trpc/trpc.interface'
import { TrpcService } from '@core/processors/trpc/trpc.service'
import { Injectable } from '@nestjs/common'

import {
  ByIdSchema,
  PaginateByTaskIdSchema,
  PaginateSchema,
} from './report.dto'
import { ReportService } from './report.service'

@Injectable()
export class ReportRouter implements TrpcRouter {
  constructor(
    private readonly trpcService: TrpcService,
    private readonly reportService: ReportService,
  ) {}

  apply() {
    const t = this.trpcService.t
    return {
      report: t.router({
        byId: t.procedure.input(ByIdSchema).query(async ({ input }) => {
          return await this.reportService.byId(input)
        }),
        paginate: t.procedure.input(PaginateSchema).query(async ({ input }) => {
          return await this.reportService.paginate(input)
        }),
        paginateByTaskId: t.procedure
          .input(PaginateByTaskIdSchema)
          .query(async ({ input }) => {
            return await this.reportService.paginateByTaskId(input)
          }),
      }),
    }
  }
}
