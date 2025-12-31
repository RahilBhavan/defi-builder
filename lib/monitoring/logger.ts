/**
 * Structured Logging Utility
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
}

class Logger {
  private minLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
    this.minLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private formatLog(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const context = entry.context ? `[${entry.context}] ` : '';
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    const error = entry.error ? ` Error: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ''}` : '';
    
    return `${entry.timestamp} ${levelName} ${context}${entry.message}${data}${error}`;
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown, error?: Error): void {
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
      // In production, send to logging service (Sentry, LogRocket, etc.)
      // For now, only log errors in production
      if (level >= LogLevel.ERROR) {
        // TODO: Integrate with error tracking service
        // Example: Sentry.captureException(error || new Error(message));
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

  error(message: string, error?: Error, context?: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, context, data, error);
  }
}

// Singleton instance
export const logger = new Logger();

