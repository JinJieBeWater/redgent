import { Module } from '@nestjs/common'
import { AiSdkService } from './ai-sdk.service'
import { RedditModule } from '../reddit/reddit.module'

@Module({
  imports: [RedditModule],
  providers: [AiSdkService],
  exports: [AiSdkService],
})
export class AiSdkModule {}
