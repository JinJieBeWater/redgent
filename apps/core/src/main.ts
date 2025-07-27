import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 加载配置
  const configService = app.get(ConfigService)

  // 启动服务
  const port = configService.get<string>('PORT')!
  await app.listen(port)
}
void bootstrap()
