import type { Response } from 'express'
import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import { convertToModelMessages, streamText } from 'ai'

import { redgentAgentSystem as RedgentAgentSystem } from '../ai-sdk/prompts'
import { myProvider } from '../ai-sdk/provider'
import { ChatDto } from './dto/chat.dto'
import { TaskAgentService } from './task-agent.service'

@Controller('task-agent')
export class TaskAgentController {
  private readonly logger = new Logger(TaskAgentController.name)

  constructor(private readonly taskAgentService: TaskAgentService) {}

  /**
   * 任务代理接口
   * 处理用户请求，并返回对话结果
   */
  @Post('/')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async chat(@Body() chat: ChatDto, @Res() res: Response) {
    try {
      this.logger.debug('Task agent request:', JSON.stringify(chat, null, 2))
      this.logger.debug(
        'Messages structure:',
        JSON.stringify(chat.messages, null, 2),
      )
      this.logger.debug(
        'convertToModelMessages:',
        JSON.stringify(convertToModelMessages(chat.messages), null, 2),
      )
      const result = streamText({
        model: myProvider.languageModel('chat-model'),
        messages: convertToModelMessages(chat.messages),
        system: RedgentAgentSystem,
        tools: this.taskAgentService.tools,
        onError: error => {
          // 记录错误日志但不暴露敏感信息
          this.logger.error('任务代理错误 streamText:', error)
        },
      })

      result.pipeUIMessageStreamToResponse(res, {
        headers: {
          'Content-Encoding': 'none',
        },
        onError: error => {
          // 记录错误日志但不暴露敏感信息
          this.logger.error('任务代理错误 result:', error)
          return error instanceof Error
            ? error.message
            : '处理请求时发生未知错误'
        },
      })
    } catch (error) {
      this.logger.error('任务代理错误 catch:', error)
      res.status(500).json({
        error: '服务器内部错误',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }
}
