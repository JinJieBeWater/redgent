import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiSdkService {
  private readonly logger = new Logger(AiSdkService.name);

  constructor() {}

  async analyze() {
    this.logger.log('开始分析...');
    // 这里是调用外部 API 进行分析的逻辑
    return '分析报告';
  }
}
