import { QueryCache } from '../../../src/lib/cache/cache';
import { DEFAULT_CACHE_CONFIG } from '../../../src/config/constants';

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({
      enabled: true,
      ttl: 1000,
      maxSize: 100
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve cached results', async () => {
      const query = 'SELECT * FROM test';
      const result = { data: [{ id: 1 }], metadata: { cacheHit: false } };

      await cache.set(query, result);
      const cached = await cache.get(query);

      expect(cached).toEqual(result);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent-query');
      expect(result).toBeNull();
    });

    it('should respect TTL', async () => {
      const query = 'SELECT * FROM test';
      const result = { data: [{ id: 1 }], metadata: { cacheHit: false } };

      await cache.set(query, result);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const cached = await cache.get(query);
      expect(cached).toBeNull();
    });

    it('should respect max size', async () => {
      const maxSize = 2;
      cache = new QueryCache({ maxSize, ttl: 1000, enabled: true });

      // Fill cache to max size
      await cache.set('query1', { data: [1], metadata: { cacheHit: false } });
      await cache.set('query2', { data: [2], metadata: { cacheHit: false } });
      await cache.set('query3', { data: [3], metadata: { cacheHit: false } });

      // First query should be evicted
      expect(await cache.get('query1')).toBeNull();
      expect(await cache.get('query2')).toBeDefined();
      expect(await cache.get('query3')).toBeDefined();
    });

    it('should not cache when disabled', async () => {
      cache = new QueryCache({ enabled: false, ttl: 1000, maxSize: 100 });
      
      const query = 'SELECT * FROM test';
      const result = { data: [{ id: 1 }], metadata: { cacheHit: false } };

      await cache.set(query, result);
      const cached = await cache.get(query);
      
      expect(cached).toBeNull();
    });
  });

  describe('Cache Clearing', () => {
    it('should clear all cached items', async () => {
      const query = 'SELECT * FROM test';
      const result = { data: [{ id: 1 }], metadata: { cacheHit: false } };

      await cache.set(query, result);
      cache.clear();
      
      const cached = await cache.get(query);
      expect(cached).toBeNull();
    });
  });

  describe('Default Configuration', () => {
    it('should use default configuration when not provided', () => {
      cache = new QueryCache(DEFAULT_CACHE_CONFIG);
      expect(cache).toBeDefined();
    });
  });
}); 