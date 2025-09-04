import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    console.log(this.formatMessage('info', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    console.error(this.formatMessage('error', message, context), trace ? `\n${trace}` : '');
  }

  warn(message: any, context?: string) {
    console.warn(this.formatMessage('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.formatMessage('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.formatMessage('verbose', message, context));
  }

  private formatMessage(level: string, message: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context || this.context || 'App';
    const levelStr = level.toUpperCase().padEnd(5);
    
    if (typeof message === 'object') {
      return `${timestamp} [${levelStr}] [${contextStr}]: ${JSON.stringify(message, null, 2)}`;
    }
    
    return `${timestamp} [${levelStr}] [${contextStr}]: ${message}`;
  }
}
