import { ModelMessage } from 'ai'
import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'

export class ChatDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  messages: ModelMessage[] = [] // AI SDK 标准消息格式
}
