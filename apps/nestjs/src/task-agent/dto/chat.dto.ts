import { UIMessage } from 'ai'
import { Type } from 'class-transformer'
import { IsArray, IsOptional, IsString } from 'class-validator'

export class ChatDto {
  @IsString()
  id!: string

  @IsArray()
  messages: UIMessage[] = []

  @IsOptional()
  @IsString()
  trigger?: string
}
