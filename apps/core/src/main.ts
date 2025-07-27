import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { TrpcService } from './processors/trpc/trpc.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 加载配置
  const configService = app.get(ConfigService)

  // 加载 trpc 服务
  const trpcService = app.get(TrpcService)
  trpcService.applyMiddleware(app)

  // 启动服务
  const port = configService.get<string>('PORT')!
  await app.listen(port)
}
void bootstrap()
