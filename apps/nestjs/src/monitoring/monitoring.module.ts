import { Module } from '@nestjs/common'
import { MonitoringConfigService } from './monitoring-config.service'

/**
 * 监控模块
 * 提供数据大小监控和配置管理功能
 */
@Module({
  providers: [MonitoringConfigService],
  exports: [MonitoringConfigService],
})
export class MonitoringModule {}
