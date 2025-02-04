import { BigQueryClient } from '../src/BigQueryClient';

describe('BigQueryClient', () => {
    let client: BigQueryClient;

    beforeAll(() => {
        client = new BigQueryClient({
            projectId: 'bigquery-project-id',
            datasetId: 'dataset-id',
            enableLogging: true,
        });
    });

    it('should execute a valid select query and return real results for users table', async () => {
        const result:any = await client.select({
            table: 'users',
            columns: ['user_id', 'name', 'email'],
            where: { user_id: 1 },
        });

        console.log(result); 

        expect(result).toBeDefined();
        expect(result.data.length).toBeGreaterThan(0);
    });


    it('should execute an update query and return success message', async () => {
        const response = await client.update({
            table: 'users',
            set: { email: 'abc@example.com' },
            where: { user_id: 1 } 
        });
    
        console.log("Update Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Update successful");
        expect(response.affectedRows).toBeGreaterThan(0); 
    });


    it('should execute a valid insert query into users table', async () => {
        const response = await client.insert({
            table: 'users',
            rows: [
                { user_id: 9, name: 'John Doe 3', email: 'johndoe3@example.com', created_at: new Date() }
            ]
        });
    
        console.log("Insert Response:", response);
    
        // ✅ Ensure at least one row was inserted
        expect(response.success).toBe(true);
        expect(response.message).toBe("Insert successful");
        expect(response.affectedRows).toBeGreaterThan(0);
    });

    it('should execute a valid delete query from users table', async () => {
        // Step 1: Execute Delete Query
        const response = await client.delete({
            table: 'users',
            where: { user_id: 6 }, // Ensure this user exists before deletion
        });
    
        console.log("Delete Response:", response);
    
        // Step 2: Assertions for expected results
        expect(response.success).toBe(true);
        expect(response.message).toBe("Delete successful");
        expect(response.affectedRows).toBeGreaterThan(0);
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
    
        console.log("Select Response:", response);
    
        // ✅ Ensure query executed successfully and returned valid data
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    

    it('should execute a valid select query with users, orders, and transactions INNER', async () => {
        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } },  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' } } // ✅ Fix join condition
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        // ✅ Ensure query executed successfully and returned valid data
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    
    
    it('should execute a valid select query with users, orders, and transactions LEFT', async () => {
        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'LEFT'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'LEFT' } // ✅ Fix join condition
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        // ✅ Ensure query executed successfully and returned valid data
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });

    it('should execute a valid select query with users, orders, and transactions RIGHT', async () => {
        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'RIGHT'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'RIGHT' } // ✅ Fix join condition
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        // ✅ Ensure query executed successfully and returned valid data
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });

    it('should execute a valid select query with users, orders, and transactions FULL', async () => {
        const response = await client.select({
            table: 'users',
            columns: {
                'users': ['user_id', 'name'],
                'orders': ['order_id', 'amount'],
                'transactions': ['transaction_id', 'product', 'price', 'quantity', 'transaction_date']
            },
            joins: [
                { table: 'orders', on: { 'users.user_id': 'orders.user_id' } , type: 'FULL'},  
                { table: 'transactions', on: { 'users.user_id': 'transactions.user_id' }, type:'FULL' } // ✅ Fix join condition
            ],
            where: { 'users.user_id': 1 }
        });
    
        console.log("Select Response:", response);
    
        // ✅ Ensure query executed successfully and returned valid data
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
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
        
    
        console.log("Select Response:", response);
    
        expect(response.success).toBe(true);
        expect(response.message).toBe("Select successful");
        expect(Array.isArray(response.data)).toBe(true);
    });
    

    test("should execute a valid select query with AVG", async () => {
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
        // expect(response.data[0]).toHaveProperty("transaction_count");
    });

});
