import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedditService } from './reddit.service';
import { RedditController } from './reddit.controller';
import { HttpModule } from '@nestjs/axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const proxy = configService.get<string>('PROXY')!;
        const proxyAgent = new HttpsProxyAgent('http://127.0.0.1:' + proxy);
        return {
          headers: {
            'User-Agent': 'Redgent/1.0 (by u/Equivalent_Emu_9077)',
          },
          httpsAgent: proxyAgent,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedditService],
  controllers: [RedditController],
  exports: [RedditService],
})
export class RedditModule {}
