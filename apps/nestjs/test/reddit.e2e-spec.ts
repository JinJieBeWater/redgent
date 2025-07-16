import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('RedditController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/reddit/hot (GET)', () => {
    return request(app.getHttpServer())
      .get('/reddit/hot')
      .expect(200)
      .expect((res: request.Response) => {
        expect(res.body).toBeDefined();
      });
  });
});
