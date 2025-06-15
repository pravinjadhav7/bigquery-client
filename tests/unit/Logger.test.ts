import { Logger } from '../../src/lib/logging/Logger';
import { DEFAULT_LOGGING_CONFIG } from '../../src/config/constants';
import { LogEntry } from '../../src/types';

describe('Logger', () => {
  // Mock console methods to reduce noise in test output
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Logging', () => {
    it('should log query information', () => {
      const logger = new Logger();
      const query = 'SELECT * FROM users';
      const params = ['param1', 'param2'];

      logger.logQuery(query, params);
      const logs = logger.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'info',
        query,
        params
      });
    });

    it('should log errors', () => {
      const logger = new Logger();
      const error = new Error('Test error');

      logger.logError(error);
      const logs = logger.getLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: 'error',
        error
      });
    });

    it('should respect max entries limit', () => {
      const logger = new Logger(true);
      const maxEntries = DEFAULT_LOGGING_CONFIG.maxEntries;
      
      // Log more entries than the limit to test LRU behavior
      const testEntries = maxEntries + 10;

      // Log more entries than the limit
      for (let i = 0; i < testEntries; i++) {
        logger.logQuery(`Query ${i}`);
      }

      // Wait for next tick to ensure logs are processed
      return new Promise(resolve => {
        setTimeout(() => {
          const logs = logger.getLogs();
          expect(logs).toHaveLength(maxEntries);
          // Check that oldest entries are evicted (first 10 entries should be gone)
          expect(logs[0].query).toBe(`Query 10`); // First entry should be Query 10
          expect(logs[maxEntries - 1].query).toBe(`Query ${testEntries - 1}`); // Last entry
          resolve(undefined);
        }, 0);
      });
    });

    it('should not log when disabled', () => {
      const logger = new Logger(false);
      logger.logQuery('SELECT * FROM users');
      expect(logger.getLogs()).toHaveLength(0);
    });

    it('should clear logs', () => {
      const logger = new Logger();
      logger.logQuery('SELECT * FROM users');
      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('Console Output', () => {
    it('should output logs to console', () => {
      const logger = new Logger();
      
      logger.logQuery('SELECT * FROM users');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should output errors to console', () => {
      const logger = new Logger();
      
      logger.logError(new Error('Test error'));
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
}); 