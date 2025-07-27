import { TrpcService } from './trpc.service'

// 应用路由器接口定义
export interface TrpcRouter {
  apply(): {
    [x: string]: ReturnType<TrpcService['t']['router']>
  }
}
