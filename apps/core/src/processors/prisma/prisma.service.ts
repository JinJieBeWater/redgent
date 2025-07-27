import { Injectable, OnModuleInit } from '@nestjs/common'

import { PrismaClient } from '@redgent/db'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [
        {
          emit: 'stdout',
          level: 'query',
        },
      ],
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
