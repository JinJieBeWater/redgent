import { Global, Module } from '@nestjs/common'

import { EeService } from './ee.service'

@Global()
@Module({
  providers: [EeService],
  exports: [EeService],
})
export class EeModule {}
