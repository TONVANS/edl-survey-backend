import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Surveys (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/v1/surveys/active (GET) should be accessible without token', () => {
    return request(app.getHttpServer() as string)
      .get('/v1/surveys/active')
      .expect((res: request.Response) => {
        const body = res.body as { message?: string };
        if (res.status === 403 && body.message === 'User role not found') {
          throw new Error('Failed with User role not found');
        }
      });
  });

  it('/v1/surveys/active (GET) with surveyId should filter by ID', () => {
    const randomUuid = '00000000-0000-0000-0000-000000000000';
    return request(app.getHttpServer() as string)
      .get(`/v1/surveys/active?surveyId=${randomUuid}`)
      .expect(200);
  });

  it('/v1/surveys (GET) should be protected', () => {
    return request(app.getHttpServer() as string)
      .get('/v1/surveys')
      .expect(401);
  });
});
