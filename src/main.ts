import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';
import { winstonConfig } from './common/logger/winston.config';

async function bootstrap() {
  const logger = winstonConfig;
  
  logger.log('🚀 Starting Job Portal Backend...', 'Bootstrap');
  logger.log('=====================================', 'Bootstrap');
  
  // Log environment variables (without sensitive values)
  logger.log('🔧 Environment Configuration:', 'Bootstrap');
  logger.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`, 'Bootstrap');
  logger.log(`  - PORT: ${process.env.PORT || 'not set'}`, 'Bootstrap');
  logger.log(`  - JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`, 'Bootstrap');
  logger.log(`  - JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? 'SET' : 'NOT SET'}`, 'Bootstrap');
  logger.log(`  - DB_HOST: ${process.env.DB_HOST || 'not set'}`, 'Bootstrap');
  logger.log(`  - MONGODB_URI: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`, 'Bootstrap');
  logger.log('=====================================', 'Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: winstonConfig,
  });
  
  // Request logging middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    logger.log(`📥 ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}...`, 'Request');
    
    // Log request body for POST/PUT/PATCH requests (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      const sanitizedBody = { ...req.body };
      // Remove sensitive fields from logging
      if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
      if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';
      if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
      if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
      if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
      
      logger.log(`📦 Request Body: ${JSON.stringify(sanitizedBody, null, 2)}`, 'Request');
    }
    
    // Log response when it's sent
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - req.startTime;
      logger.log(`📤 ${method} ${url} - Status: ${res.statusCode} - Time: ${responseTime}ms`, 'Response');
      return originalSend.call(this, data);
    };
    
    req.startTime = Date.now();
    next();
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe());
  
  // Global exception filters
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  
  // Enable CORS - Allow all origins for development
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  logger.log('=====================================', 'Bootstrap');
  logger.log(`🌐 Application is running on: http://localhost:${port}`, 'Bootstrap');
  logger.log('=====================================', 'Bootstrap');
}
bootstrap();
