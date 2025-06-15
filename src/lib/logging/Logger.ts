import { LogEntry } from '../../types';
import { DEFAULT_LOGGING_CONFIG } from '../../config/constants';

export class Logger {
    private logEntries: LogEntry[] = [];
    private readonly maxEntries: number;
    private readonly enabled: boolean;
    private readonly level: string;

    constructor(enabled: boolean = true) {
        this.enabled = enabled;
        this.maxEntries = DEFAULT_LOGGING_CONFIG.maxEntries;
        this.level = DEFAULT_LOGGING_CONFIG.level;
    }

    log(entry: LogEntry): void {
        if (!this.enabled) return;

        this.logEntries.push(entry);
        if (this.logEntries.length > this.maxEntries) {
            this.logEntries.shift();
        }

        // Implement your logging logic here (e.g., console, file, or external service)
        console.log(`[${entry.level}] ${entry.timestamp}: ${entry.query}`);
        if (entry.error) {
            console.error(entry.error);
        }
    }

    logQuery(query: string, params?: any[]): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: 'info',
            query,
            params: params || [],
            executionTime: 0
        });
    }

    logError(error: Error): void {
        this.log({
            timestamp: new Date().toISOString(),
            level: 'error',
            query: '',
            params: [],
            executionTime: 0,
            error
        });
    }

    getLogs(): LogEntry[] {
        return this.logEntries;
    }

    clearLogs(): void {
        this.logEntries = [];
    }
}