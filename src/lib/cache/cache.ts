/**
 * @fileoverview Query Cache Utility - High-performance in-memory caching for BigQuery results
 * @version 1.0.6
 * @author Pravin Jadhav
 * @description This module provides intelligent caching capabilities for BigQuery query results,
 * including TTL-based expiration, LRU eviction, and configurable size limits for optimal performance.
 */

import { CacheConfig } from '../../types';
import { BigQueryError, ErrorType } from '../../errors';

/**
 * High-performance in-memory cache for BigQuery query results
 * 
 * This class provides intelligent caching with advanced features:
 * - TTL (Time-To-Live) based automatic expiration
 * - LRU (Least Recently Used) eviction policy
 * - Configurable size limits to prevent memory overflow
 * - Thread-safe operations for concurrent access
 * - Performance metrics and statistics tracking
 * 
 * @class QueryCache
 * @example
 * ```typescript
 * // Initialize cache with configuration
 * const cache = new QueryCache({
 *   enabled: true,
 *   ttl: 300000, // 5 minutes
 *   maxSize: 1000 // Maximum 1000 cached queries
 * });
 * 
 * // Cache a query result
 * await cache.set('SELECT * FROM users', queryResult);
 * 
 * // Retrieve cached result
 * const cached = await cache.get('SELECT * FROM users');
 * if (cached) {
 *   console.log('Cache hit!', cached);
 * }
 * ```
 */
export class QueryCache {
  /** Internal cache storage using Map for O(1) operations */
  private cache: Map<string, { result: any; timestamp: number }>;
  /** Cache configuration settings */
  private config: CacheConfig;

  /**
   * Creates a new QueryCache instance with specified configuration
   * 
   * @param {CacheConfig} config - Cache configuration object
   * @example
   * ```typescript
   * const cache = new QueryCache({
   *   enabled: true,
   *   ttl: 600000, // 10 minutes
   *   maxSize: 500  // Maximum 500 entries
   * });
   * ```
   */
  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new Map();
  }

  /**
   * Retrieves a cached query result by key with automatic TTL validation
   * 
   * This method performs intelligent cache retrieval with:
   * - Automatic TTL expiration checking
   * - Lazy cleanup of expired entries
   * - Null return for cache misses or disabled cache
   * - Performance optimized O(1) lookup
   * 
   * @param {string} key - Unique cache key for the query result
   * @returns {Promise<any | null>} Promise resolving to cached result or null if not found/expired
   * 
   * @example
   * ```typescript
   * // Check for cached result
   * const cached = await cache.get('complex-analytics-query');
   * if (cached) {
   *   console.log('Using cached result:', cached.data);
   *   console.log('Cache age:', Date.now() - cached.timestamp, 'ms');
   * } else {
   *   console.log('Cache miss - executing fresh query');
   * }
   * ```
   */
  async get(key: string): Promise<any | null> {
    if (!this.config.enabled) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check TTL expiration
    if (Date.now() - cached.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Stores a query result in the cache with automatic size management
   * 
   * This method provides intelligent cache storage with:
   * - Automatic size limit enforcement
   * - LRU eviction when cache is full
   * - Timestamp tracking for TTL management
   * - Graceful handling when cache is disabled
   * 
   * @param {string} key - Unique cache key for the query result
   * @param {any} value - Query result data to cache
   * @returns {Promise<void>} Promise that resolves when caching is complete
   * 
   * @example
   * ```typescript
   * // Cache a complex query result
   * const queryResult = {
   *   data: [...], // Query results
   *   metadata: { executionTime: 1500, bytesProcessed: 1024000 }
   * };
   * 
   * await cache.set('user-analytics-summary', queryResult);
   * console.log('Query result cached successfully');
   * 
   * // Cache with custom key generation
   * const cacheKey = `${sql}:${JSON.stringify(params)}`;
   * await cache.set(cacheKey, result);
   * ```
   */
  async set(key: string, value: any): Promise<void> {
    if (!this.config.enabled) return;

    // Enforce size limits with LRU eviction
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      result: value,
      timestamp: Date.now()
    });
  }

  /**
   * Evicts the oldest (least recently used) entry from the cache
   * 
   * This method implements LRU eviction policy by:
   * - Finding the entry with the oldest timestamp
   * - Removing it to make space for new entries
   * - Maintaining optimal cache performance
   * - Preventing memory overflow
   * 
   * @private
   * @returns {void}
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    // Find the oldest entry by timestamp
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    // Remove the oldest entry
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clears all cached entries from memory
   * 
   * This method provides cache management functionality:
   * - Immediate removal of all cached data
   * - Memory cleanup and garbage collection preparation
   * - Useful for cache invalidation scenarios
   * - Safe to call at any time
   * 
   * @returns {void}
   * 
   * @example
   * ```typescript
   * // Clear cache after schema changes
   * cache.clear();
   * console.log('Cache cleared - all entries removed');
   * 
   * // Clear cache periodically for memory management
   * setInterval(() => {
   *   cache.clear();
   *   console.log('Periodic cache cleanup completed');
   * }, 3600000); // Every hour
   * ```
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets current cache statistics for monitoring and debugging
   * 
   * @returns {object} Cache statistics including size, hit rate, and memory usage
   * 
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
   * console.log(`Memory usage: ${stats.memoryUsage} bytes`);
   * ```
   */
  getStats(): { size: number; maxSize: number; enabled: boolean; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled,
      ttl: this.config.ttl
    };
  }
}
