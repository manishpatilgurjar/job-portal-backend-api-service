import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RoutesModule } from './routes';
import { HrExtractionModule } from './hr-extraction/hr-extraction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RoutesModule, // Use centralized routes module
    HrExtractionModule, // HR data extraction module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
