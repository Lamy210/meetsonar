// ログレベル制御ユーティリティ
export const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
} as const;

type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

class Logger {
    private currentLevel: LogLevel;

    constructor() {
        // 本番環境では WARNING 以上のみ、開発環境では DEBUG から
        this.currentLevel = process.env.NODE_ENV === 'production'
            ? LOG_LEVELS.WARN
            : LOG_LEVELS.DEBUG;
    }

    debug(...args: any[]) {
        if (this.currentLevel <= LOG_LEVELS.DEBUG) {
            console.log('[DEBUG]', ...args);
        }
    }

    info(...args: any[]) {
        if (this.currentLevel <= LOG_LEVELS.INFO) {
            console.info('[INFO]', ...args);
        }
    }

    warn(...args: any[]) {
        if (this.currentLevel <= LOG_LEVELS.WARN) {
            console.warn('[WARN]', ...args);
        }
    }

    error(...args: any[]) {
        if (this.currentLevel <= LOG_LEVELS.ERROR) {
            console.error('[ERROR]', ...args);
        }
    }
}

export const logger = new Logger();
