/**
 * Basic Usage Example - BigQuery Client ORM
 * 
 * This example demonstrates the basic functionality of the BigQuery Client ORM
 * including CRUD operations, caching, and error handling.
 */

import { BigQueryClient } from '../src';

async function basicUsageExample() {
  // Initialize the BigQuery client
  const client = new BigQueryClient({
    projectId: 'your-project-id',
    datasetId: 'your-dataset',
    enableLogging: true,
    enableCache: true,
    cacheTtl: 300000, // 5 minutes
    cacheMaxSize: 1000
  });

  try {
    // SELECT operation
    console.log('=== SELECT Example ===');
    const users = await client.select({
      table: 'users',
      columns: ['id', 'name', 'email', 'created_at'],
      where: { active: true },
      orderBy: [{ column: 'created_at', direction: 'DESC' }],
      limit: 10
    });
    console.log('Active users:', users.data);

    // INSERT operation
    console.log('\n=== INSERT Example ===');
    const insertResult = await client.insert({
      table: 'users',
      rows: [
        {
          name: 'John Doe',
          email: 'john@example.com',
          active: true,
          created_at: new Date().toISOString()
        },
        {
          name: 'Jane Smith',
          email: 'jane@example.com',
          active: true,
          created_at: new Date().toISOString()
        }
      ]
    });
    console.log('Insert result:', insertResult);

    // UPDATE operation
    console.log('\n=== UPDATE Example ===');
    const updateResult = await client.update({
      table: 'users',
      set: { 
        last_login: new Date().toISOString(),
        login_count: 1
      },
      where: { email: 'john@example.com' }
    });
    console.log('Update result:', updateResult);

    // Raw SQL query
    console.log('\n=== Raw SQL Example ===');
    const rawResult = await client.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as user_count
      FROM users 
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]);
    console.log('Daily user registrations:', rawResult.data);

    // JOIN query
    console.log('\n=== JOIN Example ===');
    const joinResult = await client.select({
      table: 'users',
      columns: {
        'users': ['id', 'name', 'email'],
        'orders': ['order_id', 'total', 'created_at']
      },
      joins: [{
        table: 'orders',
        on: { 'users.id': 'orders.user_id' },
        type: 'LEFT'
      }],
      where: { 'users.active': true },
      orderBy: [{ column: 'orders.created_at', direction: 'DESC' }],
      limit: 20
    });
    console.log('Users with orders:', joinResult.data);

  } catch (error) {
    console.error('Error in basic usage example:', error);
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample()
    .then(() => console.log('\nBasic usage example completed'))
    .catch(console.error);
}

export { basicUsageExample }; 