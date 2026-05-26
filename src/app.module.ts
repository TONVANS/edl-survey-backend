import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { RegionsModule } from './regions/regions.module';
import { ProvincesModule } from './provinces/provinces.module';
import { DistrictsModule } from './districts/districts.module';
import { VillagesModule } from './villages/villages.module';
import { SurveysModule } from './surveys/surveys.module';
import { SurveySectionsModule } from './survey-sections/survey-sections.module';
import { QuestionsModule } from './questions/questions.module';
import { QuestionOptionsModule } from './question-options/question-options.module';
import { SurveyResponsesModule } from './survey-responses/survey-responses.module';
import { AnswersModule } from './answers/answers.module';
import { CustomerTypesModule } from './customer-types/customer-types.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    RegionsModule,
    ProvincesModule,
    DistrictsModule,
    VillagesModule,
    SurveysModule,
    SurveySectionsModule,
    QuestionsModule,
    QuestionOptionsModule,
    SurveyResponsesModule,
    AnswersModule,
    CustomerTypesModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
