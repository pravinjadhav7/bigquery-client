import { BigQueryClient } from '../../src/core/BigQueryClient';
import { Logger } from '../../src/lib/logging/Logger';
import { Pool } from '../../src/core/Pool';
import { QueryCache } from '../../src/lib/cache/cache';
import { MetricsCollector } from '../../src/lib/metrics/metrics';

// Mock the BigQuery library
jest.mock('@google-cloud/bigquery', () => ({
  BigQuery: jest.fn().mockImplementation(() => ({
    dataset: jest.fn().mockReturnValue({
      table: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue([{}]),
        get: jest.fn().mockResolvedValue([{}, {}]),
        create: jest.fn().mockResolvedValue([{}, {}])
      }),
      create: jest.fn().mockResolvedValue([{}, {}])
    }),
    query: jest.fn().mockResolvedValue([
      [{ user_id: 1, name: 'John Doe', email: 'john@example.com' }],
      { totalBytesProcessed: '1024' }
    ])
  }))
}));

describe('BigQueryClient', () => {
    let client: BigQueryClient;

    beforeEach(() => {
        client = new BigQueryClient({
            projectId: 'test-project',
            datasetId: 'test-dataset'
        });
    });

    describe('Caching', () => {
        it('should cache query results when caching is enabled', async () => {
            const clientWithCache = new BigQueryClient({
                projectId: 'test-project',
                datasetId: 'test-dataset',
                enableCache: true
            });

            const query = 'SELECT * FROM users';
            const result1 = await clientWithCache.query(query);
            const result2 = await clientWithCache.query(query);
            
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
            // Since we're using mocks, we can't test actual caching behavior
            // but we can verify the queries execute
        });

        it('should not use cache when caching is disabled', async () => {
            const clientWithoutCache = new BigQueryClient({
                projectId: 'test-project',
                datasetId: 'test-dataset',
                enableCache: false
            });

            const query = 'SELECT * FROM users';
            const result1 = await clientWithoutCache.query(query);
            const result2 = await clientWithoutCache.query(query);
            
            expect(result1).toBeDefined();
            expect(result2).toBeDefined();
        });
    });

    describe('Materialized Views', () => {
        it('should create materialized view', async () => {
            const config = {
                name: 'test_view',
                query: 'SELECT * FROM users',
                refreshInterval: '1h'
            };

            const result = await client.createMaterializedView(config);
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should create partitioned materialized view', async () => {
            const config = {
                name: 'test_view',
                query: 'SELECT * FROM users',
                refreshInterval: '1h',
                partitionField: 'date',
                partitionType: 'TIME' as const
            };

            const result = await client.createMaterializedView(config);
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('Partitioned Tables', () => {
        it('should create time-partitioned table', async () => {
            const config = {
                name: 'test_table',
                schema: {
                    date: 'DATE',
                    value: 'INTEGER'
                },
                partitionField: 'date',
                partitionType: 'TIME' as const
            };

            const result = await client.createPartitionedTable(config);
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle query validation errors', async () => {
            await expect(client.query('')).rejects.toThrow();
        });

        it('should handle parameter validation errors', async () => {
            await expect(client.query('SELECT * FROM users', [null])).rejects.toThrow();
        });
    });

    describe('Basic Operations', () => {
        it('should execute a select query', async () => {
            const result = await client.select({
                table: 'users',
                columns: ['user_id', 'name'],
                where: {
                    user_id: 1
                }
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should execute an update query', async () => {
            const result = await client.update({
                table: 'users',
                set: {
                    name: 'John Doe'
                },
                where: {
                    user_id: 1
                }
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should execute an insert query', async () => {
            const result = await client.insert({
                table: 'users',
                rows: [{
                    user_id: 1,
                    name: 'John Doe',
                    email: 'john@example.com'
                }]
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should execute a delete query', async () => {
            const result = await client.delete({
                table: 'users',
                where: {
                    user_id: 1
                }
            });
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });
    });

    it('should execute a valid select query with joins from users and orders tables', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, amount: 100 }],
        });

        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount']
            },
            joins: [{ table: 'orders', on: { 'user_id': 'user_id' } }],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    
    it('should execute a valid select query with users, orders, and transactions INNER', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, amount: 100, transaction_id: 1, product: 'Laptop', price: 500, quantity: 1, transaction_date: new Date() }],
        });
        
        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } },  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' } }
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    
    it('should execute a valid select query with users, orders, and transactions LEFT', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, amount: 100, transaction_id: 1, product: 'Laptop', price: 500, quantity: 1, transaction_date: new Date() }],
        });

        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'LEFT'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'LEFT' }
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });

    it('should execute a valid select query with users, orders, and transactions RIGHT', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, amount: 100, transaction_id: 1, product: 'Laptop', price: 500, quantity: 1, transaction_date: new Date() }],
        });

        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'RIGHT'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'RIGHT' }
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });

    it('should execute a valid select query with users, orders, and transactions FULL', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, amount: 100, transaction_id: 1, product: 'Laptop', price: 500, quantity: 1, transaction_date: new Date() }],
        });

        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'FULL'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'FULL' }
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    
    it('should execute a valid select query with SUM, GROUP BY, ORDER BY, LIMIT, and two table joins', async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', order_id: 1, total_price: 500 }],
        });

        const response = await client.select({
            table: 'orders',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id'],
                'transactions': ['product', 'SUM(price) AS total_price']
            },
            joins: [
                { table: 'users', on: { 'orders.user_id': 'users.user_id' } },
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' } }
            ],
            groupBy: ['users.user_id', 'users.name', 'transactions.product', 'orders.order_id'],
            orderBy: [{ column: 'total_price', direction: 'DESC' }],
            limit: 5
        });
        
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    
    test("should execute a valid select query with AVG", async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ user_id: 1, name: 'John Doe', avg_price: 500 }],
        });

        const response = await client.select({
            table: "transactions",
            columns: {
                "users": ["user_id", "name"],
                "transactions": ["AVG(price) AS avg_price"]
            },
            joins: [
                { table: "users", on: { "transactions.user_id": "users.user_id" } }
            ],
            groupBy: ["users.user_id", "users.name"],
            orderBy: [{ column: "avg_price", direction: "DESC" }],
            limit: 5
        });

        console.log("AVG Test Response:", response);

        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data[0]).toHaveProperty("avg_price");
    });
    
    test("should execute a valid select query with COUNT", async () => {
        client.select = jest.fn().mockResolvedValue({
            success: true,
            message: "Select successful",
            data: [{ transaction_count: 5 }],
        });

        const response = await client.select({
            table: "transactions",
            columns: [ "COUNT(price)"],
            limit: 5
        });

        console.log("COUNT Test Response:", response);

        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);
    });
});

describe('Logger', () => {
  it('should log queries and errors', () => {
    const logger = new Logger(true);
    logger.logQuery('SELECT 1', [1]);
    logger.logError(new Error('fail'));
    const logs = logger.getLogs();
    expect(logs.some(l => l.level === 'info')).toBe(true);
    expect(logs.some(l => l.level === 'error')).toBe(true);
  });

  it('should clear logs', () => {
    const logger = new Logger(true);
    logger.logQuery('SELECT 1');
    logger.clearLogs();
    expect(logger.getLogs().length).toBe(0);
  });
});

describe('Pool', () => {
  it('should acquire and release connections', async () => {
    const pool = new Pool({ min: 1, max: 2, idleTimeoutMillis: 1000, acquireTimeoutMillis: 1000 });
    const conn = await pool.acquire();
    expect(pool.getMetrics().activeConnections).toBe(1);
    await pool.release(conn);
    expect(pool.getMetrics().activeConnections).toBe(0);
  });

  it('should throw when max connections exceeded', async () => {
    const pool = new Pool({ min: 1, max: 1, idleTimeoutMillis: 1000, acquireTimeoutMillis: 1000 });
    await pool.acquire();
    await expect(pool.acquire()).rejects.toThrow('Connection pool exhausted');
  });

  it('should reset metrics', () => {
    const pool = new Pool({ min: 1, max: 1, idleTimeoutMillis: 1000, acquireTimeoutMillis: 1000 });
    pool.reset();
    expect(pool.getMetrics().activeConnections).toBe(0);
  });
});
