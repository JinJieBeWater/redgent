import { Test, TestingModule } from '@nestjs/testing'
import { MastraService } from './mastra.service'
import { ConfigModule } from '@nestjs/config'
import Joi from 'joi'

describe('MastraService', () => {
  let service: MastraService
  let module: TestingModule

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
          validationSchema: Joi.object({
            NODE_ENV: Joi.string()
              .valid('development', 'production', 'test')
              .default('development'),
            PORT: Joi.number().default(3002),
            PROXY: Joi.number().default(7890),
            REDDIT_CLIENT_ID: Joi.string().required(),
            REDDIT_SECRET: Joi.string().required(),
            DATABASE_URL: Joi.string().required(),
          }),
          validationOptions: {
            abortEarly: true,
          },
        }),
      ],
      providers: [MastraService],
    }).compile()

    service = module.get<MastraService>(MastraService)
  })

  afterAll(async () => {
    await module.close()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
