import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('🚀 Starting Job Portal Backend...');
  console.log('=====================================');
  
  const app = await NestFactory.create(AppModule);
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log('=====================================');
  console.log(`🌐 Application is running on: http://localhost:${port}`);
  console.log('=====================================');
}
bootstrap();
