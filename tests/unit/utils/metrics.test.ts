import { MetricsCollector } from '../../../src/lib/metrics/metrics';
import { QueryMetrics } from '../../../src/types';

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    metricsCollector = new MetricsCollector();
  });

  describe('Query Metrics', () => {
    it('should record query metrics', () => {
      const metrics: QueryMetrics = {
        executionTime: 100,
        bytesProcessed: 1000,
        rowsAffected: 10,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      metricsCollector.recordQuery(metrics);
      const collectedMetrics = metricsCollector.getMetrics();

      expect(collectedMetrics.queries).toHaveLength(1);
      expect(collectedMetrics.queries[0]).toEqual(metrics);
    });

    it('should calculate average execution time', () => {
      const metrics1: QueryMetrics = {
        executionTime: 100,
        bytesProcessed: 1000,
        rowsAffected: 10,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      const metrics2: QueryMetrics = {
        executionTime: 200,
        bytesProcessed: 2000,
        rowsAffected: 20,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      metricsCollector.recordQuery(metrics1);
      metricsCollector.recordQuery(metrics2);

      const collectedMetrics = metricsCollector.getMetrics();
      expect(collectedMetrics.performance.averageExecutionTime).toBe(150);
    });

    it('should calculate total bytes processed', () => {
      const metrics1: QueryMetrics = {
        executionTime: 100,
        bytesProcessed: 1000,
        rowsAffected: 10,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      const metrics2: QueryMetrics = {
        executionTime: 200,
        bytesProcessed: 2000,
        rowsAffected: 20,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      metricsCollector.recordQuery(metrics1);
      metricsCollector.recordQuery(metrics2);

      const collectedMetrics = metricsCollector.getMetrics();
      expect(collectedMetrics.performance.totalBytesProcessed).toBe(3000);
    });
  });

  describe('Error Recording', () => {
    it('should record errors', () => {
      const error = new Error('Test error');
      metricsCollector.recordError(error);

      const collectedMetrics = metricsCollector.getMetrics();
      expect(collectedMetrics.errors).toHaveLength(1);
      expect(collectedMetrics.errors[0]).toBe(error);
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', () => {
      const metrics: QueryMetrics = {
        executionTime: 100,
        bytesProcessed: 1000,
        rowsAffected: 10,
        cacheHit: false,
        timestamp: new Date().toISOString()
      };

      metricsCollector.recordQuery(metrics);
      metricsCollector.recordError(new Error('Test error'));
      metricsCollector.reset();

      const collectedMetrics = metricsCollector.getMetrics();
      expect(collectedMetrics.queries).toHaveLength(0);
      expect(collectedMetrics.errors).toHaveLength(0);
      expect(collectedMetrics.performance.averageExecutionTime).toBe(0);
      expect(collectedMetrics.performance.totalBytesProcessed).toBe(0);
    });
  });
}); 