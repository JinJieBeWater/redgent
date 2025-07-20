import { Module } from '@nestjs/common'

import { MastraService } from './mastra.service'

@Module({
  providers: [MastraService],
})
export class MastraModule {}
