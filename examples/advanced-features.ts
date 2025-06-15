/**
 * Advanced Features Example - BigQuery Client ORM
 * 
 * This example demonstrates advanced features including materialized views,
 * partitioned tables, performance monitoring, and batch operations.
 */

import { BigQueryClient, MetricsCollector } from '../src';

async function advancedFeaturesExample() {
  // Initialize the BigQuery client with advanced configuration
  const client = new BigQueryClient({
    projectId: 'your-project-id',
    datasetId: 'analytics',
    enableLogging: true,
    enableCache: true,
    cacheTtl: 600000, // 10 minutes
    cacheMaxSize: 2000
  });

  const metrics = new MetricsCollector();

  try {
    // Create a materialized view for analytics
    console.log('=== Materialized View Example ===');
    const materializedViewResult = await client.createMaterializedView({
      name: 'user_analytics_mv',
      query: `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as daily_signups,
          COUNT(DISTINCT email) as unique_users,
          AVG(age) as avg_age
        FROM users 
        WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
        GROUP BY DATE(created_at)
      `,
      refreshInterval: '1h',
      partitionField: 'date'
    });
    console.log('Materialized view created:', materializedViewResult);

    // Create a partitioned table for high-volume data
    console.log('\n=== Partitioned Table Example ===');
    const partitionedTableResult = await client.createPartitionedTable({
      name: 'events_partitioned',
      schema: {
        event_id: 'STRING',
        user_id: 'INTEGER',
        event_type: 'STRING',
        event_data: 'JSON',
        timestamp: 'TIMESTAMP'
      },
      partitionField: 'timestamp',
      partitionType: 'TIME'
    });
    console.log('Partitioned table created:', partitionedTableResult);

    // Batch insert for high-volume data
    console.log('\n=== Batch Insert Example ===');
    const batchData = Array.from({ length: 1000 }, (_, i) => ({
      event_id: `event_${i}`,
      user_id: Math.floor(Math.random() * 10000),
      event_type: ['click', 'view', 'purchase', 'signup'][Math.floor(Math.random() * 4)],
      event_data: JSON.stringify({ 
        page: `/page_${Math.floor(Math.random() * 100)}`,
        session_id: `session_${Math.floor(Math.random() * 1000)}`
      }),
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString()
    }));

    const batchResult = await client.batchInsert('events_partitioned', batchData);
    console.log('Batch insert completed:', batchResult);

    // Complex analytical query with performance monitoring
    console.log('\n=== Performance Monitoring Example ===');
    const startTime = Date.now();
    
    const analyticsResult = await client.query(`
      WITH user_metrics AS (
        SELECT 
          user_id,
          COUNT(*) as event_count,
          COUNT(DISTINCT event_type) as unique_events,
          MIN(timestamp) as first_event,
          MAX(timestamp) as last_event
        FROM events_partitioned
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY user_id
      ),
      user_segments AS (
        SELECT 
          user_id,
          event_count,
          unique_events,
          CASE 
            WHEN event_count >= 100 THEN 'high_activity'
            WHEN event_count >= 20 THEN 'medium_activity'
            ELSE 'low_activity'
          END as activity_segment
        FROM user_metrics
      )
      SELECT 
        activity_segment,
        COUNT(*) as user_count,
        AVG(event_count) as avg_events_per_user,
        AVG(unique_events) as avg_unique_events
      FROM user_segments
      GROUP BY activity_segment
      ORDER BY avg_events_per_user DESC
    `);

    const executionTime = Date.now() - startTime;
    
    // Record metrics
    metrics.recordQuery({
      executionTime,
      bytesProcessed: 1024000, // This would come from BigQuery metadata
      rowsAffected: analyticsResult.data.length,
      cacheHit: false,
      timestamp: new Date().toISOString()
    });

    console.log('Analytics result:', analyticsResult.data);
    console.log('Query execution time:', executionTime, 'ms');

    // Stream insert for real-time data
    console.log('\n=== Stream Insert Example ===');
    const streamData = [
      {
        event_id: 'realtime_event_1',
        user_id: 12345,
        event_type: 'purchase',
        event_data: JSON.stringify({ 
          product_id: 'prod_123',
          amount: 99.99,
          currency: 'USD'
        }),
        timestamp: new Date().toISOString()
      }
    ];

    const streamResult = await client.streamInsert('events_partitioned', streamData);
    console.log('Stream insert completed:', streamResult);

    // MERGE operation for data synchronization
    console.log('\n=== MERGE Operation Example ===');
    const mergeResult = await client.merge({
      targetTable: 'user_profiles',
      sourceTable: 'user_updates',
      on: { 'user_profiles.user_id': 'user_updates.user_id' },
      whenMatched: 'UPDATE SET name = user_updates.name, email = user_updates.email, updated_at = CURRENT_TIMESTAMP()',
      whenNotMatched: 'INSERT (user_id, name, email, created_at) VALUES (user_updates.user_id, user_updates.name, user_updates.email, CURRENT_TIMESTAMP())'
    });
    console.log('Merge operation completed:', mergeResult);

    // Get performance metrics
    console.log('\n=== Performance Metrics ===');
    const performanceMetrics = metrics.getMetrics();
    console.log('Total queries:', performanceMetrics.queries.length);
    console.log('Average execution time:', performanceMetrics.performance.averageExecutionTime, 'ms');
    console.log('Total bytes processed:', performanceMetrics.performance.totalBytesProcessed);

    // Advanced statistics
    const advancedStats = metrics.getAdvancedStats();
    console.log('Advanced statistics:', advancedStats);

  } catch (error) {
    console.error('Error in advanced features example:', error);
    metrics.recordError(error as Error);
  }
}

// Run the example
if (require.main === module) {
  advancedFeaturesExample()
    .then(() => console.log('\nAdvanced features example completed'))
    .catch(console.error);
}

export { advancedFeaturesExample }; 