import { Module } from '@nestjs/common'

import { AiSdkService } from './ai-sdk.service'

@Module({
  providers: [AiSdkService],
  exports: [AiSdkService],
})
export class AiSdkModule {}
