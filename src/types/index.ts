export interface QueryResult<T> {
  data: T[];
  metadata: {
    totalRows: number;
    schema: any;
    executionTime: number;
    bytesProcessed: number;
  };
}

export interface QueryMetrics {
  executionTime: number;
  bytesProcessed: number;
  rowsAffected: number;
  cacheHit: boolean;
  timestamp: string;
}

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  query: string;
  params: any[];
  executionTime: number;
  error?: Error;
}

export interface QueryOptimization {
  suggestedIndexes: string[];
  estimatedCost: number;
  optimizationTips: string[];
}

export interface MaterializedViewConfig {
  name: string;
  query: string;
  refreshInterval: string;
  partitionField?: string;
}

export interface PartitionedTableConfig {
  name: string;
  schema: any;
  partitionField: string;
  partitionType: 'RANGE' | 'TIME' | 'INGESTION_TIME';
}
