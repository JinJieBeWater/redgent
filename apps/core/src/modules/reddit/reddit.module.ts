import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { RedditService } from './reddit.service'

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const proxy = configService.get<string>('PROXY')!
        const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:' + proxy)
        return {
          headers: {
            'User-Agent': 'Redgent/1.0 (by u/Equivalent_Emu_9077)',
          },
          httpsAgent: proxyAgent,
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedditService],
  exports: [RedditService],
})
export class RedditModule {}
