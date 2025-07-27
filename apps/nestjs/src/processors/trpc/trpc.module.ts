import { Global, Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'

import { TrpcService } from './trpc.service'

@Module({
  imports: [DiscoveryModule],
  providers: [TrpcService],
  exports: [TrpcService],
})
@Global()
export class TrpcModule {}
