/**
 * BigQuery Client ORM - Main Entry Point
 * 
 * A comprehensive TypeScript ORM for Google BigQuery with advanced features
 * including intelligent caching, performance monitoring, and security validation.
 * 
 * @version 1.0.6
 * @author Pravin Jadhav
 * @license MIT
 * 
 * @example
 * ```typescript
 * import { BigQueryClient } from 'bigquery-client';
 * 
 * const client = new BigQueryClient({
 *   projectId: 'your-project-id',
 *   keyFilename: 'path/to/service-account.json'
 * });
 * 
 * // Execute queries with intelligent caching
 * const users = await client.select('users', ['id', 'name'], { active: true });
 * ```
 */

// Core functionality
export { BigQueryClient, QueryBuilder, Pool, Transaction } from './core';

// Library utilities
export { QueryCache } from './lib/cache';
export { MetricsCollector } from './lib/metrics';
export { QueryValidator } from './lib/validation';
export { Logger } from './lib/logging';

// Configuration and constants
export * from './config';

// Type definitions
export * from './types';

// Error classes
export * from './errors';

// Default export for convenience
export { BigQueryClient as default } from './core';
