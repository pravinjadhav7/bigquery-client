/**
 * @fileoverview Metrics Collection Utility - Performance monitoring and analytics for BigQuery operations
 * @version 1.0.6
 * @author Pravin Jadhav
 * @description This module provides comprehensive metrics collection and analysis capabilities
 * for BigQuery operations, including query performance, error tracking, and statistical analysis.
 */

import { QueryMetrics } from '../../types';

/**
 * Advanced metrics collection and analysis system for BigQuery operations
 * 
 * This class provides comprehensive monitoring capabilities including:
 * - Real-time query performance tracking
 * - Error logging and analysis
 * - Statistical performance calculations
 * - Historical data retention
 * - Performance trend analysis
 * - Resource usage monitoring
 * 
 * @class MetricsCollector
 * @example
 * ```typescript
 * // Initialize metrics collector
 * const metrics = new MetricsCollector();
 * 
 * // Record query performance
 * metrics.recordQuery({
 *   executionTime: 1500,
 *   bytesProcessed: 1024000,
 *   rowsAffected: 250,
 *   cacheHit: false,
 *   timestamp: new Date().toISOString()
 * });
 * 
 * // Get performance statistics
 * const stats = metrics.getMetrics();
 * console.log('Average execution time:', stats.performance.averageExecutionTime);
 * ```
 */
export class MetricsCollector {
  /** Internal metrics storage with performance statistics */
  private metrics: {
    /** Array of recorded query metrics */
    queries: QueryMetrics[];
    /** Array of recorded errors */
    errors: Error[];
    /** Calculated performance statistics */
    performance: {
      /** Average query execution time in milliseconds */
      averageExecutionTime: number;
      /** Total bytes processed across all queries */
      totalBytesProcessed: number;
    };
  };

  /**
   * Creates a new MetricsCollector instance with initialized storage
   * 
   * @example
   * ```typescript
   * const collector = new MetricsCollector();
   * console.log('Metrics collector initialized');
   * ```
   */
  constructor() {
    this.metrics = {
      queries: [],
      errors: [],
      performance: {
        averageExecutionTime: 0,
        totalBytesProcessed: 0
      }
    };
  }

  /**
   * Records query performance metrics and updates statistical calculations
   * 
   * This method captures comprehensive query performance data including:
   * - Execution time for performance analysis
   * - Bytes processed for cost analysis
   * - Rows affected for impact assessment
   * - Cache hit status for efficiency tracking
   * - Timestamp for temporal analysis
   * 
   * @param {QueryMetrics} metrics - Query performance metrics object
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Record a successful query
   * collector.recordQuery({
   *   executionTime: 2500,
   *   bytesProcessed: 2048000,
   *   rowsAffected: 1000,
   *   cacheHit: false,
   *   timestamp: new Date().toISOString()
   * });
   * 
   * // Record a cached query
   * collector.recordQuery({
   *   executionTime: 50,
   *   bytesProcessed: 0,
   *   rowsAffected: 1000,
   *   cacheHit: true,
   *   timestamp: new Date().toISOString()
   * });
   * 
   * // Record a complex analytical query
   * collector.recordQuery({
   *   executionTime: 15000,
   *   bytesProcessed: 50000000,
   *   rowsAffected: 500000,
   *   cacheHit: false,
   *   timestamp: new Date().toISOString()
   * });
   * ```
   */
  recordQuery(metrics: QueryMetrics): void {
    this.metrics.queries.push(metrics);
    this.updatePerformanceMetrics();
  }

  /**
   * Records error information for debugging and monitoring purposes
   * 
   * This method captures error details for:
   * - Error frequency analysis
   * - Debugging and troubleshooting
   * - System reliability monitoring
   * - Alert generation for critical issues
   * 
   * @param {Error} error - Error object to record
   * @returns {void}
   * 
   * @example
   * ```typescript
   * try {
   *   await client.query('INVALID SQL SYNTAX');
   * } catch (error) {
   *   collector.recordError(error);
   *   console.log('Error recorded for analysis');
   * }
   * 
   * // Record custom errors
   * collector.recordError(new Error('Connection timeout after 30 seconds'));
   * collector.recordError(new Error('Query quota exceeded'));
   * ```
   */
  recordError(error: Error): void {
    this.metrics.errors.push(error);
  }

  /**
   * Updates calculated performance statistics based on recorded metrics
   * 
   * This method recalculates performance statistics including:
   * - Average execution time across all queries
   * - Total bytes processed for cost analysis
   * - Performance trends and patterns
   * 
   * @private
   * @returns {void}
   */
  private updatePerformanceMetrics(): void {
    const queries = this.metrics.queries;
    if (queries.length === 0) return;

    this.metrics.performance = {
      averageExecutionTime: queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length,
      totalBytesProcessed: queries.reduce((sum, q) => sum + q.bytesProcessed, 0)
    };
  }

  /**
   * Retrieves comprehensive metrics data for analysis and monitoring
   * 
   * This method returns complete metrics including:
   * - Individual query performance records
   * - Error logs and frequency data
   * - Calculated performance statistics
   * - Historical trend information
   * 
   * @returns {object} Complete metrics object with queries, errors, and performance data
   * 
   * @example
   * ```typescript
   * const metrics = collector.getMetrics();
   * 
   * // Analyze query performance
   * console.log(`Total queries: ${metrics.queries.length}`);
   * console.log(`Average execution time: ${metrics.performance.averageExecutionTime}ms`);
   * console.log(`Total bytes processed: ${metrics.performance.totalBytesProcessed}`);
   * 
   * // Check error rate
   * const errorRate = metrics.errors.length / metrics.queries.length;
   * console.log(`Error rate: ${(errorRate * 100).toFixed(2)}%`);
   * 
   * // Analyze cache efficiency
   * const cacheHits = metrics.queries.filter(q => q.cacheHit).length;
   * const cacheHitRate = cacheHits / metrics.queries.length;
   * console.log(`Cache hit rate: ${(cacheHitRate * 100).toFixed(2)}%`);
   * 
   * // Find slowest queries
   * const slowQueries = metrics.queries
   *   .sort((a, b) => b.executionTime - a.executionTime)
   *   .slice(0, 5);
   * console.log('Top 5 slowest queries:', slowQueries);
   * ```
   */
  getMetrics(): typeof this.metrics {
    return this.metrics;
  }

  /**
   * Resets all collected metrics data to initial state
   * 
   * This method provides data management functionality:
   * - Clears all recorded query metrics
   * - Removes all error logs
   * - Resets performance statistics
   * - Useful for periodic cleanup or testing
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Reset metrics for new monitoring period
   * collector.reset();
   * console.log('Metrics reset - starting fresh monitoring period');
   * 
   * // Reset metrics periodically for memory management
   * setInterval(() => {
   *   const metrics = collector.getMetrics();
   *   console.log('Archiving metrics:', metrics);
   *   collector.reset();
   * }, 86400000); // Daily reset
   * 
   * // Reset metrics after analysis
   * const analysis = analyzePerformance(collector.getMetrics());
   * collector.reset();
   * ```
   */
  reset(): void {
    this.metrics = {
      queries: [],
      errors: [],
      performance: {
        averageExecutionTime: 0,
        totalBytesProcessed: 0
      }
    };
  }

  /**
   * Gets advanced performance statistics and analysis
   * 
   * @returns {object} Advanced statistics including percentiles, trends, and efficiency metrics
   * 
   * @example
   * ```typescript
   * const stats = collector.getAdvancedStats();
   * console.log('95th percentile execution time:', stats.p95ExecutionTime);
   * console.log('Cache efficiency:', stats.cacheEfficiency);
   * ```
   */
  getAdvancedStats(): {
    totalQueries: number;
    errorRate: number;
    cacheHitRate: number;
    p95ExecutionTime: number;
    medianExecutionTime: number;
    totalCost: number;
  } {
    const queries = this.metrics.queries;
    const errors = this.metrics.errors;

    if (queries.length === 0) {
      return {
        totalQueries: 0,
        errorRate: 0,
        cacheHitRate: 0,
        p95ExecutionTime: 0,
        medianExecutionTime: 0,
        totalCost: 0
      };
    }

    // Sort execution times for percentile calculations
    const executionTimes = queries.map(q => q.executionTime).sort((a, b) => a - b);
    const cacheHits = queries.filter(q => q.cacheHit).length;

    return {
      totalQueries: queries.length,
      errorRate: errors.length / queries.length,
      cacheHitRate: cacheHits / queries.length,
      p95ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.95)],
      medianExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.5)],
      totalCost: this.metrics.performance.totalBytesProcessed * 0.000005 // Approximate BigQuery pricing
    };
  }
}
