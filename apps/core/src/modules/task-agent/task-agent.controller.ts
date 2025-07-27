import type { Response } from 'express'
import { redgentAgentSystem } from '@core/ai-sdk/prompts'
import { myProvider } from '@core/ai-sdk/provider'
import {
  Body,
  Controller,
  Logger,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common'
import {
  convertToModelMessages,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  stepCountIs,
  streamText,
  UIDataTypes,
  UIMessage,
} from 'ai'

import { APPUITools } from '@redgent/shared'

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
      const self = this

      const stream = createUIMessageStream<
        UIMessage<unknown, UIDataTypes, APPUITools>
      >({
        execute({ writer }) {
          const result = streamText({
            model: myProvider.languageModel('chat-model'),
            messages: convertToModelMessages(chat.messages),
            system: redgentAgentSystem,
            tools: self.taskAgentService.tools(writer),
            onError: error => {
              // 记录错误日志但不暴露敏感信息
              self.logger.error('任务代理错误 streamText:', error)
            },
            stopWhen: stepCountIs(5),
          })
          writer.merge(result.toUIMessageStream())
        },
      })

      pipeUIMessageStreamToResponse({
        response: res,
        stream,
        headers: {
          'Content-Encoding': 'none',
        },
      })

      // result.pipeUIMessageStreamToResponse(res, {
      //   headers: {
      //     'Content-Encoding': 'none',
      //   },
      //   onError: error => {
      //     // 记录错误日志但不暴露敏感信息
      //     this.logger.error('任务代理错误 result:', error)
      //     return error instanceof Error
      //       ? error.message
      //       : '处理请求时发生未知错误'
      //   },
      // })
    } catch (error) {
      this.logger.error('任务代理错误 catch:', error)
      res.status(500).json({
        error: '服务器内部错误',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }
}
