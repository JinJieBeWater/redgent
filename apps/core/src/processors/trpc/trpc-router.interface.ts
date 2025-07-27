import { OnModuleInit } from '@nestjs/common'

import { t } from './trpc.instance'

/**
 * tRPC 路由器接口
 * 定义 tRPC 路由器类应该实现的标准结构
 */
export interface ITrpcRouter extends OnModuleInit {
  /**
   * 路由器实例，在 onModuleInit 中初始化
   */
  router: ReturnType<typeof t.router>
}
