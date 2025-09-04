import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  console.log('🚀 Starting Job Portal Backend...');
  console.log('=====================================');
  
  const app = await NestFactory.create(AppModule);
  
  // Request logging middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';
    
    console.log(`📥 [${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}...`);
    
    // Log request body for POST/PUT/PATCH requests (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
      const sanitizedBody = { ...req.body };
      // Remove sensitive fields from logging
      if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
      if (sanitizedBody.confirmPassword) sanitizedBody.confirmPassword = '[REDACTED]';
      if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
      if (sanitizedBody.refreshToken) sanitizedBody.refreshToken = '[REDACTED]';
      if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
      
      console.log(`📦 Request Body:`, JSON.stringify(sanitizedBody, null, 2));
    }
    
    // Log response when it's sent
    const originalSend = res.send;
    res.send = function(data) {
      const responseTime = Date.now() - req.startTime;
      console.log(`📤 [${timestamp}] ${method} ${url} - Status: ${res.statusCode} - Time: ${responseTime}ms`);
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
  
  console.log('=====================================');
  console.log(`🌐 Application is running on: http://localhost:${port}`);
  console.log('=====================================');
}
bootstrap();
