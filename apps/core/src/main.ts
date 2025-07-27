import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { TrpcRouter } from './processors/trpc/trpc.router'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 加载配置
  const configService = app.get(ConfigService)

  // 启用 trpc
  const trpc = app.get(TrpcRouter)
  trpc.applyMiddleware(app)

  // 启动服务
  const port = configService.get<string>('PORT')!
  await app.listen(port)
}
void bootstrap()
