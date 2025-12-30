/**
 * Structured Logging Utility (Backend)
 * Replaces console.log with structured logging for production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
  error?: Error;
  userId?: string;
  requestId?: string;
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatLog(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}] ` : '';
    const userId = entry.userId ? `[user:${entry.userId}] ` : '';
    const requestId = entry.requestId ? `[req:${entry.requestId}] ` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const error = entry.error ? ` Error: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ''}` : '';
    
    return `${entry.timestamp} ${levelName} ${context}${userId}${requestId}${entry.message}${data}${error}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown, error?: Error, userId?: string, requestId?: string): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
      error,
      userId,
      requestId,
    };

    const formatted = this.formatLog(entry);

    // In development, use console methods for better debugging
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
          console.error(formatted);
          break;
      }
    } else {
      // In production, send to logging service
      // TODO: Integrate with structured logging service (Winston, Pino, etc.)
      // For now, only log errors and warnings in production
      if (level >= LogLevel.WARN) {
        console.error(formatted);
      }
    }
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, error?: Error, context?: string, data?: unknown, userId?: string, requestId?: string): void {
    this.log(LogLevel.ERROR, message, context, data, error, userId, requestId);
  }
}

// Singleton instance
export const logger = new Logger();

