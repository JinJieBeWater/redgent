import EventEmitter from 'node:events'
import { Injectable } from '@nestjs/common'

@Injectable()
export class EeService extends EventEmitter {}
