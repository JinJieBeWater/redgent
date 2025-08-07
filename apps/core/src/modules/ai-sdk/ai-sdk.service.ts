import { createDeepSeek } from '@ai-sdk/deepseek'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { customProvider } from 'ai'

import { analysisModel, chatModel, structureModel } from './models.test'

@Injectable()
export class AiSdkService {
  private _myProvider: ReturnType<typeof this.createProvider>
  constructor(private readonly configService: ConfigService) {}

  get myProvider() {
    if (!this._myProvider) {
      this._myProvider = this.createProvider()
    }
    return this._myProvider
  }

  createProvider() {
    const DEEPSEEK_API_KEY = this.configService.get<string>('DEEPSEEK_API_KEY')
    const deepseek = createDeepSeek({
      apiKey: DEEPSEEK_API_KEY!,
    })

    return process.env.NODE_ENV === 'test'
      ? customProvider({
          languageModels: {
            'chat-model': chatModel,
            'structure-model': structureModel,
            'analysis-model': analysisModel,
          },
        })
      : customProvider({
          languageModels: {
            'chat-model': deepseek.chat('deepseek-chat'),
            'structure-model': deepseek.chat('deepseek-chat'),
            'analysis-model': deepseek.chat('deepseek-chat'),
          },
        })
  }
}
