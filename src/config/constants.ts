export const DEFAULT_POOL_CONFIG = {
    min: 1,
    max: 10,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000
};

export const DEFAULT_CACHE_CONFIG = {
    enabled: false,
    ttl: 300000, // 5 minutes
    maxSize: 1000
};

export const DEFAULT_LOGGING_CONFIG = {
    enabled: true,
    level: 'info',
    maxEntries: 1000
};

export const QUERY_TIMEOUT = 30000; // 30 seconds

export const AGGREGATE_FUNCTIONS = new Set([
    'SUM',
    'AVG',
    'COUNT',
    'MIN',
    'MAX',
    'ARRAY_AGG',
    'STRING_AGG',
    'BIT_AND',
    'BIT_OR',
    'BIT_XOR',
    'LOGICAL_AND',
    'LOGICAL_OR',
    'ANY_VALUE',
    'COUNTIF',
    'GROUPING',
    'MAX_BY',
    'MIN_BY'
]);
