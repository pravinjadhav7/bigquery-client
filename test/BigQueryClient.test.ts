import { BigQueryClient } from '../src/BigQueryClient';
import { BigQuery } from '@google-cloud/bigquery';
jest.mock('@google-cloud/bigquery', () => {
    return {
        BigQuery: jest.fn().mockImplementation(() => {
            return {
                query: jest.fn(),
                createQueryJob: jest.fn().mockResolvedValue([
                    {
                        metadata: {
                            statistics: { query: 'EXPLAIN PLAN' },
                        },
                    },
                ]),
            };
        }),
    };
});

describe('BigQueryClient', () => {
    let client: BigQueryClient;
    beforeEach(() => {
        client = new BigQueryClient({
            projectId: 'test',
            datasetId: 'test'
        });
    });


    it('should generate a valid update query', async () => {

        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        await client.update({
            table: 'test',
            set: { status: 'done', updated_at: new Date() },
            where: { id: 1 }
        });
        console.log(mockQuery.mock.calls[0][0].query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/UPDATE\s+`?test\.test`?\.`?test`?\s+SET\s+status\s+=\s+\?,\s*updated_at\s+=\s+\?\s+WHERE\s+id\s+=\s+\?/m)
            })
        );
    });


    it('should generate a valid insert query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        await client.insert({
            table: 'test',
            rows: [{ id: 1, name: 'test' }]
        });
        console.log(mockQuery.mock.calls[0][0].query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/INSERT\s+INTO\s+`?test\.test`?\.`?test`?\s+\(id,\s+name\)\s+VALUES\s+\(\?,\s+\?\)/m)
            })
        );
    });

    it('should generate a valid delete query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        await client.delete({
            table: 'test',
            where: { id: 1 }
        });

        console.log(mockQuery.mock.calls[0][0].query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/DELETE\s+FROM\s+`?test\.test`?\.`?test`?\s+WHERE\s+id\s+=\s+\?/m)
            })
        );
    });

    it('should generate a valid select query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        // Step 1: Get QueryBuilder
        const qb = await client.select({
            table: 'test',
            columns: ['id', 'name'],
            where: { id: 1 },
        });
    
        // Step 2: Build the query
        const { query, params } = qb.build();
    
        // Step 3: Execute query
        await client.query(query, params);
    
        console.log(query);  // Debugging Output
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT\s+id,\s+name\s+FROM\s+`?test\.test`?\.`?test`?\s+WHERE\s+id\s+=\s+\?/m),
            })
        );
    });
    


    it('should generate a valid select query with joins', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'test',
            columns: ['id', 'name'],
            joins: [{ table: 'test2', on: { 'test.id': 'test2.id' } }],
            where: { id: 1 }
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(
                    /SELECT\s+id,\s+name\s+FROM\s+`?test\.test`?\.`?test`?\s+INNER\s+JOIN\s+`?test\.test`?\.`?test2`?\s+ON\s+test\.id\s+=\s+test2\.id\s+WHERE\s+id\s+=\s+\?/m
                ),
            })
        );
    });
    

    it('should generate a valid select query with joins and where clause', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'test',
            columns: ['id', 'name'],
            joins: [{ table: 'test2', on: { 'test.id': 'test2.id' } }],
            where: { id: 1, 'test2.id': 2 }
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(
                    /SELECT\s+id,\s+name\s+FROM\s+`?test\.test`?\.`?test`?\s+INNER\s+JOIN\s+`?test\.test`?\.`?test2`?\s+ON\s+test\.id\s+=\s+test2\.id\s+WHERE\s+id\s+=\s+\? AND test2\.id\s+=\s+\?/m
                ),
            })
        );
    });
    
    


    it('should generate a SELECT query with JOINs', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        // Step 1: Get QueryBuilder instance
        const qb = await client.select({
            table: 'users',
            columns: ['users.id', 'users.name', 'orders.total'],
            joins: [
                { table: 'orders', on: { 'users.id': 'orders.user_id' }, type: 'LEFT' },
            ],
            where: { 'users.status': 'active' },
        });
    
        // Step 2: Build the query
        const { query, params } = qb.build();
    
        // Step 3: Execute the query
        await client.query(query, params);
    
        console.log(query); // Debugging Output
        expect(query).toMatch(/SELECT users.id, users.name, orders.total FROM/);
        expect(query).toMatch(/LEFT JOIN/);
    });
    

    it('should generate a SELECT query with JOINs and WHERE clause', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        // Step 1: Get QueryBuilder instance
        const qb = await client.select({
            table: 'users',
            columns: ['users.id', 'users.name', 'orders.total'],
            joins: [
                { table: 'orders', on: { 'users.id': 'orders.user_id' }, type: 'LEFT' },
            ],
            where: { 'users.status': 'active', 'orders.status': 'pending' },
        });
    
        // Step 2: Build the query
        const { query, params } = qb.build();
    
        // Step 3: Execute the query
        await client.query(query, params);
    
        console.log(query); // Debugging Output
        expect(query).toMatch(/SELECT users.id, users.name, orders.total FROM/);
        expect(query).toMatch(/LEFT JOIN/);
        expect(query).toMatch(/WHERE users.status = \? AND orders.status = \?/);
    });
    

    it('should build a MERGE query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        await client.merge({
          targetTable: 'users',
          sourceTable: 'incoming_users',
          on: { 'users.id': 'incoming_users.id' },
          whenMatched: 'UPDATE SET users.name = incoming_users.name',
          whenNotMatched: 'INSERT (id, name) VALUES (incoming_users.id, incoming_users.name)',
        });
        
        console.log(mockQuery.mock.calls[0][0].query);
        expect(mockQuery).toHaveBeenCalledWith(
          expect.objectContaining({
            query: expect.stringContaining('MERGE INTO'),
          })
        );
    });
 
    it('should generate a valid COUNT query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'users',
            columns: ['COUNT(*)'],
            groupBy: ['status'],
            where: { status: 'active' },
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT COUNT\(\*\) FROM `?test\.test`?\.`?users`? WHERE status = \?/m)
            })
        );
    });
    
    

    it('should generate a valid SUM query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'orders',
            columns: ['SUM(total) as total_sum'],
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT SUM\(total\) as total_sum FROM `?test\.test`?\.`?orders`?/m)
            })
        );
    });
    


    it('should generate a valid AVG query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
        
        const qb = await client.select({
            table: 'orders',
            columns: ['AVG(total) as avg_total'],
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT AVG\(total\) as avg_total FROM `?test\.test`?\.`?orders`?/m)
            })
        );
    });

    it('should generate a valid MAX query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['MAX(total) as max_total'],
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT MAX\(total\) as max_total FROM `?test\.test`?\.`?orders`?/m)
            })
        );
    });

    it('should generate a valid MIN query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['MIN(total) as min_total'],
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT MIN\(total\) as min_total FROM `?test\.test`?\.`?orders`?/m)
            })
        );
    });

    it('should generate a paginated query with LIMIT and OFFSET', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
            columns: ['id', 'name'],
            limit: 10,
            offset: 20,
        });
    
        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT id, name FROM `?test\.test`?\.`?users`? LIMIT 10 OFFSET 20/m)
            })
        );
    });


    it('should perform a dry run to explain query execution plans', async () => {
        const mockCreateQueryJob = (client as any).bigQuery.createQueryJob;
    
        const plan = await client.explain('SELECT * FROM users');
        console.log(plan); // Debugging Output
    
        expect(mockCreateQueryJob).toHaveBeenCalledWith(
            expect.objectContaining({ query: 'SELECT * FROM users', dryRun: true })
        );
    
        // Fix assertion to match actual structure
        expect(plan).toEqual(expect.objectContaining({ statistics: expect.any(Object) }));
    });
    

    it('should generate a valid query for filtering array fields using UNNEST', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'users',
            columns: ['id'],
        });
    
        qb.whereArray('user_ids', [1, 2, 3]); // Apply filter
    
        const { query, params } = qb.build(); // Get final query
        await client.query(query, params); // Execute query
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('IN UNNEST'),
            })
        );
    });
    
    it('should generate a valid query for filtering JSON fields using JSON_EXTRACT', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'orders',
            columns: ['id'],
        });
    
        qb.whereJsonField('details', 'customer.name', 'John Doe');
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('JSON_EXTRACT'),
            })
        );
    });
    
    it('should generate a valid query for filtering NULL values', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'users',
            columns: ['id'],
        });
    
        qb.whereNull('email');
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('IS NULL'),
            })
        );
    });
    
    it('should generate a valid query for filtering NOT NULL values', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'users',
            columns: ['id'],
        });
    
        qb.whereNotNull('email');
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('IS NOT NULL'),
            })
        );
    });
    
    it('should generate a valid query for approximate query results using TABLESAMPLE SYSTEM()', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'large_dataset',
            columns: ['id'],
        });
    
        qb.tableSample(10); // Apply table sample
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(query).toContain('TABLESAMPLE SYSTEM');
    });
    
    
    it('should generate a valid query using LIKE operator', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({
            table: 'users',
            columns: ['id', 'name'],
        });
    
        qb.whereLike('name', '%John%');
    
        const { query, params } = qb.build();
    
        await client.query(query, params);
    
        console.log(query); 
    
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/SELECT id, name FROM `?test\.test`?\.`?users`? WHERE name LIKE \?/m),
            })
        );
    
        expect(params).toContain('%John%');
    });
    
    
    it('should generate a valid query using EXISTS condition', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
            columns: ['id', 'name'],
        });

        qb.whereExists('SELECT 1 FROM orders WHERE users.id = orders.user_id');

        const { query, params } = qb.build();

        await client.query(query, params);

        console.log(query);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('WHERE EXISTS (SELECT 1 FROM orders WHERE users.id = orders.user_id)'),
            })
        );
    });

    it('should generate a valid query using NOT EXISTS condition', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
            columns: ['id', 'name'],
        });

        qb.whereNotExists('SELECT 1 FROM orders WHERE users.id = orders.user_id');

        const { query, params } = qb.build();

        await client.query(query, params);

        console.log(query);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining('WHERE NOT EXISTS (SELECT 1 FROM orders WHERE users.id = orders.user_id)'),
            })
        );
    });

    it('should generate a valid CASE statement in SELECT', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
            columns: ['id'],
        });

        qb.case('status', [
            { when: "'active'", then: "'Active User'" },
            { when: "'inactive'", then: "'Inactive User'" }
        ], "'Unknown'", 'user_status');

        const { query, params } = qb.build();

        await client.query(query, params);

        console.log(query);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("CASE WHEN 'active' THEN ? WHEN 'inactive' THEN ? ELSE ? END AS user_status"),
            })
        );

        expect(params).toEqual(["'Active User'", "'Inactive User'", "'Unknown'"]);
    });

    it('should generate a valid query using NOT LIKE operator', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
            columns: ['id', 'name'],
        });

        qb.whereNotLike('name', '%John%');

        const { query, params } = qb.build();

        await client.query(query, params);

        console.log(query);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/WHERE name NOT LIKE \?/m),
            })
        );

        expect(params).toContain('%John%');
    });

    it('should generate a valid query using BETWEEN condition', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['id', 'total'],
        });

        qb.whereBetween('total', 100, 500);

        const { query, params } = qb.build();

        await client.query(query, params);

        console.log(query);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringMatching(/WHERE total BETWEEN \? AND \?/m),
            })
        );

        expect(params).toEqual([100, 500]);
    });


    it('should generate a valid query using DATE BETWEEN', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['id'],
        });

        qb.whereDateBetween('created_at', '2024-01-01', '2024-12-31');

        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE created_at BETWEEN DATE(?) AND DATE(?)"),
            })
        );

        expect(params).toEqual(['2024-01-01', '2024-12-31']);
    });

    it('should generate a valid query using EXTRACT function', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['id'],
        });

        qb.whereExtract('created_at', 'YEAR', 2024);

        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE EXTRACT(YEAR FROM created_at) = ?"),
            })
        );

        expect(params).toEqual([2024]);
    });

    it('should generate a valid query for checking if a date falls on a Monday', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['id'],
        });

        qb.whereDayOfWeek('created_at', 2);

        const { query, params } = qb.build();
        await client.query(query, params);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE EXTRACT(DAYOFWEEK FROM created_at) = ?"),
            })
        );

        expect(params).toEqual([2]);
    });

    it('should generate a valid date comparison query', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'events',
            columns: ['id'],
        });

        qb.whereDateComparison('start_date', '<', 'end_date');

        const { query } = qb.build();
        await client.query(query);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE start_date < end_date"),
            })
        );
    });

    it('should generate a query for formatting date as string', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'users',
        });

        qb.selectFormattedDate('created_at', '%Y-%m-%d', 'formatted_date');

        const { query } = qb.build();
        await client.query(query);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("SELECT FORMAT_TIMESTAMP('%Y-%m-%d', created_at) AS formatted_date"),
            })
        );
    });

    it('should generate a query for filtering by current date', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;

        const qb = await client.select({
            table: 'orders',
            columns: ['id'],
        });

        qb.whereCurrentDate('created_at');

        const { query } = qb.build();
        await client.query(query);

        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE created_at = CURRENT_DATE()"),
            })
        );
    });


    it('should generate a valid query for timestamp between', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'orders', columns: ['id'] });
        qb.whereTimestampBetween('created_at', '2024-01-01 00:00:00', '2024-12-31 23:59:59');
    
        const { query, params } = qb.build();
        await client.query(query, params);
    
        console.log(query);
        expect(mockQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                query: expect.stringContaining("WHERE created_at BETWEEN TIMESTAMP(?) AND TIMESTAMP(?)"),
            })
        );
        expect(params).toEqual(['2024-01-01 00:00:00', '2024-12-31 23:59:59']);
    });

    it('should generate a valid query for date truncation', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'events', columns: ['id'] });
        qb.whereDateTrunc('start_date', 'MONTH', 'truncated_month');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("DATE_TRUNC(start_date, MONTH) AS truncated_month");
    });
    

    it('should generate a valid query for date truncation', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'events', columns: ['id'] });
        qb.whereDateTrunc('start_date', 'MONTH', 'truncated_month');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("DATE_TRUNC(start_date, MONTH) AS truncated_month");
    });

    it('should generate a valid query for timestamp truncation', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'events', columns: ['id'] });
        qb.whereTimestampTrunc('created_at', 'DAY', 'truncated_day');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("TIMESTAMP_TRUNC(created_at, DAY) AS truncated_day");
    });
    

    it('should generate a valid query using CONTAINS_SUBSTR()', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'users', columns: ['id'] });
        qb.whereContains('name', 'John');
    
        const { query, params } = qb.build();
        console.log(query);
    
        expect(query).toContain("CONTAINS_SUBSTR(name, ?)");
        expect(params).toContain('John');
    });
    
    
    it('should generate a valid query using ARRAY_CONTAINS()', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'products', columns: ['id'] });
        qb.whereArrayContains('tags', 'electronics');
    
        const { query, params } = qb.build();
        console.log(query);
    
        expect(query).toContain("ARRAY_CONTAINS(?, tags)");
        expect(params).toContain('electronics');
    });

    
    it('should generate a valid query using ARRAY_LENGTH()', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'teams', columns: ['id'] });
        qb.whereArrayLength('members', 5, '>');
    
        const { query, params } = qb.build();
        console.log(query);
    
        expect(query).toContain("ARRAY_LENGTH(members) > ?");
        expect(params).toContain(5);
    });

    
    it('should generate a valid query using IS DISTINCT FROM', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'users', columns: ['id'] });
        qb.whereNotEqualNullSafe('email', 'test@example.com');
    
        const { query, params } = qb.build();
        console.log(query);
    
        expect(query).toContain("email IS DISTINCT FROM ?");
        expect(params).toContain('test@example.com');
    });

    
    it('should generate a valid query using STRING_AGG()', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'categories' });
        qb.selectStringAgg('name', ', ', 'category_list');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("STRING_AGG(name, ', ') AS category_list");
    });

    
    it('should generate a valid query for conditional SUM', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'orders' });
        qb.selectConditionalSum('total', "status = 'completed'", 'total_completed');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) AS total_completed");
    });

    it('should generate a valid query using a window function', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'employees' });
        qb.selectWindowFunction('RANK', 'department', 'salary', 'salary_rank');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("RANK() OVER (PARTITION BY department ORDER BY salary) AS salary_rank");
    });
    
    
    it('should generate a valid query for JSON field extraction', async () => {
        const mockQuery = jest.fn();
        (client as any).bigQuery.query = mockQuery;
    
        const qb = await client.select({ table: 'orders' });
        qb.selectJsonField('details', 'customer.name', 'customer_name');
    
        const { query } = qb.build();
        console.log(query);
    
        expect(query).toContain("JSON_VALUE(details, '$.customer.name') AS customer_name");
    });
    
        
});