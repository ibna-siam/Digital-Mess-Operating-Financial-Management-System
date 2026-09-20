type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  debug(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== 'test') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  info(message: string, meta?: unknown) {
    if (process.env.NODE_ENV !== 'test') {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: unknown) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: unknown) {
    console.error(this.formatMessage('error', message, meta));
  }
}

export const logger = new Logger();
