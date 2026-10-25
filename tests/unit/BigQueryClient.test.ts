import { BigQueryClient } from '../../src/core/BigQueryClient';
import { Logger } from '../../src/lib/logging/Logger';
import { Pool } from '../../src/core/Pool';
import { mockBigQuery } from '../helpers/mockBigQuery';

// Only the SDK is mocked (see tests/helpers/mockBigQuery.ts); BigQueryClient runs for real.
jest.mock('@google-cloud/bigquery', () => require('../helpers/mockBigQuery').sdkModule);

const T = (name: string) => `\`test-project.test-dataset.${name}\``;

describe('BigQueryClient', () => {
    let client: BigQueryClient;

    beforeEach(() => {
        mockBigQuery.reset();
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        client = new BigQueryClient({
            projectId: 'test-project',
            datasetId: 'test-dataset'
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Caching', () => {
        it('should serve the second identical query from cache when caching is enabled', async () => {
            const clientWithCache = new BigQueryClient({
                projectId: 'test-project',
                datasetId: 'test-dataset',
                enableCache: true
            });
            mockBigQuery.queueQueryResult([{ user_id: 1 }]);

            const query = 'SELECT * FROM users';
            const result1 = await clientWithCache.query(query);
            const result2 = await clientWithCache.query(query);

            expect(mockBigQuery.queries).toHaveLength(1);
            expect(result1.data).toEqual([{ user_id: 1 }]);
            expect(result2.data).toEqual([{ user_id: 1 }]);
            // cacheHit is set at runtime but missing from the QueryResult type (additive fix for 1.x)
            expect((result2.metadata as any).cacheHit).toBe(true);
        });

        it('should hit BigQuery on every call when caching is disabled', async () => {
            const clientWithoutCache = new BigQueryClient({
                projectId: 'test-project',
                datasetId: 'test-dataset',
                enableCache: false
            });
            mockBigQuery.queueQueryResult([{ user_id: 1 }]).queueQueryResult([{ user_id: 1 }]);

            const query = 'SELECT * FROM users';
            await clientWithoutCache.query(query);
            await clientWithoutCache.query(query);

            expect(mockBigQuery.queries).toHaveLength(2);
        });

        it('should not share cache entries between different params', async () => {
            const clientWithCache = new BigQueryClient({
                projectId: 'test-project',
                datasetId: 'test-dataset',
                enableCache: true
            });

            await clientWithCache.query('SELECT * FROM users WHERE user_id = ?', [1]);
            await clientWithCache.query('SELECT * FROM users WHERE user_id = ?', [2]);

            expect(mockBigQuery.queries.map(q => q.params)).toEqual([[1], [2]]);
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
            expect(result.success).toBe(true);
            expect(mockBigQuery.lastQuery()?.sql).toContain(`CREATE MATERIALIZED VIEW ${T('test_view')}`);
            expect(mockBigQuery.lastQuery()?.sql).toContain('SELECT * FROM users');
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
            expect(result.success).toBe(true);
            expect(mockBigQuery.lastQuery()?.sql).toContain('PARTITION BY date');
        });

        // TODO(bug: materialized-view-refresh-ddl): emits `REFRESH EVERY <interval>`, which is not
        // BigQuery syntax (refresh is configured through OPTIONS(refresh_interval_minutes=...)).
        test.failing('should not emit REFRESH EVERY in materialized view DDL', async () => {
            await client.createMaterializedView({
                name: 'test_view',
                query: 'SELECT * FROM users',
                refreshInterval: '1h'
            });

            expect(mockBigQuery.lastQuery()!.sql).not.toMatch(/REFRESH EVERY/i);
        });

        // TODO(bug: materialized-view-partition-order): PARTITION BY is appended after the
        // AS <query> clause; BigQuery requires it before AS.
        test.failing('should place PARTITION BY before the AS <query> clause', async () => {
            await client.createMaterializedView({
                name: 'test_view',
                query: 'SELECT * FROM users',
                refreshInterval: '1h',
                partitionField: 'date'
            });

            const sql = mockBigQuery.lastQuery()!.sql!;
            expect(sql.indexOf('PARTITION BY')).toBeLessThan(sql.search(/\bAS\s+SELECT/i));
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
            expect(result.success).toBe(true);
            const sql = mockBigQuery.lastQuery()!.sql!;
            expect(sql).toContain(`CREATE TABLE ${T('test_table')}`);
            expect(sql).toContain('(date DATE, value INTEGER)');
        });

        // TODO(bug: partitioned-table-ddl): emits `PARTITION BY TIME(date)`; BigQuery has no TIME()
        // partition function (partition by the DATE column, DATE(ts), or TIMESTAMP_TRUNC(ts, ...)).
        test.failing('should not emit PARTITION BY TIME(...) for time partitioning', async () => {
            await client.createPartitionedTable({
                name: 'test_table',
                schema: { date: 'DATE' },
                partitionField: 'date',
                partitionType: 'TIME'
            });

            expect(mockBigQuery.lastQuery()!.sql).not.toMatch(/PARTITION BY\s+TIME\s*\(/i);
        });
    });

    describe('Error Handling', () => {
        it('should handle query validation errors', async () => {
            await expect(client.query('')).rejects.toThrow();
            expect(mockBigQuery.calls).toHaveLength(0);
        });

        it('should handle parameter validation errors', async () => {
            await expect(client.query('SELECT * FROM users', [null])).rejects.toThrow();
            expect(mockBigQuery.calls).toHaveLength(0);
        });
    });

    describe('Basic Operations', () => {
        it('should execute a select query', async () => {
            mockBigQuery.queueQueryResult([{ user_id: 1, name: 'John Doe' }]);

            const result = await client.select({
                table: 'users',
                columns: ['user_id', 'name'],
                where: {
                    user_id: 1
                }
            });

            expect(result).toEqual({
                success: true,
                message: 'Select successful',
                data: [{ user_id: 1, name: 'John Doe' }]
            });
            expect(mockBigQuery.lastQuery()).toMatchObject({
                sql: `SELECT u.user_id, u.name FROM ${T('users')} AS u WHERE u.user_id = ?`,
                params: [1]
            });
        });

        it('should report no records found when select returns zero rows', async () => {
            const result = await client.select({ table: 'users', columns: ['user_id'] });

            expect(result).toEqual({ success: false, message: 'No records found', data: [] });
        });

        it('should rethrow the underlying error when select fails', async () => {
            mockBigQuery.queueQueryError(new Error('quota exceeded'));

            await expect(client.select({ table: 'users', columns: ['user_id'] })).rejects.toThrow('quota exceeded');
        });

        it('should execute an update query', async () => {
            mockBigQuery.queueJobStatistics({ query: { numDmlAffectedRows: '3' } });
            const result = await client.update({
                table: 'users',
                set: {
                    name: 'John Doe'
                },
                where: {
                    user_id: 1
                }
            });

            expect(result).toEqual({ success: true, message: 'Update successful', affectedRows: 3 });
            expect(mockBigQuery.callsOf('createQueryJob')).toHaveLength(1);
            expect(mockBigQuery.callsOf('createQueryJob')[0]).toMatchObject({
                sql: `UPDATE ${T('users')} SET name = ? WHERE user_id = ?`,
                params: ['John Doe', 1]
            });
        });

        it('should reject an update with an empty WHERE clause without calling BigQuery', async () => {
            await expect(client.update({ table: 'users', set: { name: 'x' }, where: {} })).rejects.toThrow(
                'WHERE clause cannot be empty'
            );
            expect(mockBigQuery.calls).toHaveLength(0);
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

            expect(result).toEqual({ success: true, message: 'Insert successful', affectedRows: 1 });
            expect(mockBigQuery.lastQuery()).toMatchObject({
                sql: `INSERT INTO ${T('users')} (user_id, name, email) VALUES (?, ?, ?)`,
                params: [1, 'John Doe', 'john@example.com']
            });
        });

        it('should return success:false when the insert fails at BigQuery', async () => {
            mockBigQuery.queueQueryError(new Error('quota exceeded'));

            const result = await client.insert({ table: 'users', rows: [{ user_id: 1 }] });

            expect(result).toEqual({ success: false, message: 'Insert failed', affectedRows: 0 });
        });

        it('should execute a delete query and report the affected rows from job statistics', async () => {
            mockBigQuery.queueJobStatistics({ query: { numDmlAffectedRows: '2' } });

            const result = await client.delete({ table: 'users', where: { user_id: 1 } });

            expect(result).toEqual({ success: true, message: 'Delete successful', affectedRows: 2 });
            expect(mockBigQuery.calls).toHaveLength(1);
            expect(mockBigQuery.callsOf('createQueryJob')[0]).toMatchObject({
                sql: `DELETE FROM ${T('users')} WHERE user_id = ?`,
                params: [1]
            });
        });

        it('should not hardcode user_id when deleting by another column', async () => {
            mockBigQuery.queueJobStatistics({ query: { numDmlAffectedRows: '1' } });

            await client.delete({ table: 'orders', where: { order_id: 7 } });

            expect(mockBigQuery.calls).toHaveLength(1);
            expect(mockBigQuery.calls[0].sql).not.toContain('user_id');
            expect(mockBigQuery.calls[0].params).toEqual([7]);
        });

        it('should report 0 affected rows when the DML matched nothing', async () => {
            mockBigQuery.queueJobStatistics({ query: { numDmlAffectedRows: '0' } });

            const result = await client.delete({ table: 'users', where: { user_id: 99 } });

            expect(result).toMatchObject({ success: true, affectedRows: 0 });
        });
    });

    describe('Explain and batch operations', () => {
        it('should run explain as a dry-run job with params', async () => {
            const metadata = await client.explain('SELECT * FROM users WHERE user_id = ?', [1]);

            expect(metadata).toMatchObject({ dryRun: true });
            expect(mockBigQuery.callsOf('createQueryJob')[0].options).toEqual({
                query: 'SELECT * FROM users WHERE user_id = ?',
                dryRun: true,
                params: [1]
            });
        });

        it('should batch insert rows through the table insert API', async () => {
            await client.batchInsert('users', [{ user_id: 1 }, { user_id: 2 }]);

            expect(mockBigQuery.callsOf('table.insert')[0]).toMatchObject({
                dataset: 'test-dataset',
                table: 'users',
                rows: [{ user_id: 1 }, { user_id: 2 }]
            });
        });

        it('should reject batchInsert of zero rows without calling BigQuery', async () => {
            await expect(client.batchInsert('users', [])).rejects.toThrow('No rows to insert');
            expect(mockBigQuery.calls).toHaveLength(0);
        });
    });

    describe('select with joins and aggregates', () => {
        const rows = [{ any: 'row' }];
        beforeEach(() => {
            mockBigQuery.queueQueryResult(rows);
        });

        it('should execute a valid select query with joins from users and orders tables', async () => {
            const response = await client.select({
                table: 'users',
                columns: {
                    'users': ['user_id', 'name'],
                    'orders': ['order_id', 'amount']
                },
                joins: [{ table: 'orders', on: { 'user_id': 'user_id' } }],
                where: { 'users.user_id': 1 }
            });

            expect(response).toEqual({ success: true, message: 'Select successful', data: rows });
            expect(mockBigQuery.lastQuery()).toMatchObject({
                sql:
                    `SELECT u.user_id, u.name, o.order_id, o.amount FROM ${T('users')} AS u ` +
                    `INNER JOIN ${T('orders')} AS o ON u.user_id = o.user_id WHERE u.user_id = ?`,
                params: [1]
            });
        });

        const threeTable = (type?: 'LEFT' | 'RIGHT' | 'FULL') => ({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' }, ...(type && { type }) },
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, ...(type && { type }) }
            ],
            where: { 'users.user_id': 1 }
        });

        it.each([
            ['INNER', undefined],
            ['LEFT', 'LEFT'],
            ['RIGHT', 'RIGHT'],
            ['FULL', 'FULL']
        ] as const)('should execute a valid select query with users, orders, and transactions %s', async (joinType, type) => {
            const response = await client.select(threeTable(type));

            expect(response).toEqual({ success: true, message: 'Select successful', data: rows });
            expect(mockBigQuery.lastQuery()).toMatchObject({
                sql:
                    `SELECT u.user_id, u.name, o.order_id, o.amount, ` +
                    `t.transaction_id, t.product, t.price, t.quantity, t.transaction_date ` +
                    `FROM ${T('users')} AS u ` +
                    `${joinType} JOIN ${T('orders')} AS o ON u.user_id = o.user_id ` +
                    `${joinType} JOIN ${T('transactions')} AS t ON u.user_id = t.user_id ` +
                    `WHERE u.user_id = ?`,
                params: [1]
            });
        });

        it('should execute a valid select query with SUM, GROUP BY, ORDER BY, LIMIT, and two table joins', async () => {
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

            expect(response.success).toBe(true);
            expect(mockBigQuery.lastQuery()).toMatchObject({
                sql:
                    `SELECT u.user_id, u.name, o.order_id, t.product, SUM(t.price) AS total_price ` +
                    `FROM ${T('orders')} AS o ` +
                    `INNER JOIN ${T('users')} AS u ON o.user_id = u.user_id ` +
                    `INNER JOIN ${T('transactions')} AS t ON u.user_id = t.user_id ` +
                    `GROUP BY u.user_id, u.name, t.product, o.order_id ` +
                    `ORDER BY total_price DESC LIMIT 5`,
                params: []
            });
        });

        test('should execute a valid select query with AVG', async () => {
            const response = await client.select({
                table: 'transactions',
                columns: {
                    'users': ['user_id', 'name'],
                    'transactions': ['AVG(price) AS avg_price']
                },
                joins: [
                    { table: 'users', on: { 'transactions.user_id': 'users.user_id' } }
                ],
                groupBy: ['users.user_id', 'users.name'],
                orderBy: [{ column: 'avg_price', direction: 'DESC' }],
                limit: 5
            });

            expect(response.success).toBe(true);
            expect(mockBigQuery.lastQuery()?.sql).toBe(
                `SELECT u.user_id, u.name, AVG(t.price) AS avg_price ` +
                `FROM ${T('transactions')} AS t ` +
                `INNER JOIN ${T('users')} AS u ON t.user_id = u.user_id ` +
                `GROUP BY u.user_id, u.name ORDER BY avg_price DESC LIMIT 5`
            );
        });

        test('should execute a valid select query with COUNT', async () => {
            const response = await client.select({
                table: 'transactions',
                columns: ['COUNT(price)'],
                limit: 5
            });

            expect(response.success).toBe(true);
            expect(response.data).toEqual(rows);
            expect(mockBigQuery.lastQuery()?.sql).toBe(
                `SELECT COUNT(t.price) AS count_price FROM ${T('transactions')} AS t LIMIT 5`
            );
        });
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
