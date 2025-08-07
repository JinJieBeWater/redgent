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
        const proxyUrl = configService.get<string>('PROXY_URL')
        return {
          headers: {
            'User-Agent': 'Redgent/1.0 (by u/Equivalent_Emu_9077)',
          },
          httpsAgent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedditService],
  exports: [RedditService],
})
export class RedditModule {}
