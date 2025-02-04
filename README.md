# BigQuery Client 🚀
A feature-rich Node.js client for Google BigQuery with support for CRUD operations, transactions, query building, and advanced features like aggregate functions, pagination, and logging.

![NPM Version](https://img.shields.io/npm/v/bigquery-client)
![License](https://img.shields.io/npm/l/bigquery-client?clear_cache=true)
![Build Status](https://github.com/pravinjadhav7/bigquery-client/actions/workflows/Build.yml/badge.svg)

---

## ✨ About This Package?
Working directly with Google BigQuery often requires writing complex SQL queries manually. This package provides an **abstraction layer** for interacting with BigQuery, enabling developers to:

- **💡 Dynamic SQL Query Builder**: Chainable query methods.
- **📊 CRUD Operations**: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `MERGE`.
- **⚡ Transactions**: Execute multiple queries as a batch.
- **🔗 JOIN Support**: `INNER JOIN`, `LEFT JOIN`, `RIGHT JOIN`, `FULL JOIN`.
- **🚀 Advanced Features**: **Aggregates, JSON functions, window functions, filtering, CASE expressions**.
- **📦 Minified Version**: Auto-generates `dist/index.min.js` for performance.
- **📝 TypeScript & JavaScript Support**.

---

## 📦 Installation
Install the package using **npm** or **yarn**:

```sh
npm install bigquery-client
# OR
yarn add bigquery-client
```

## 🚀 Quick Start

### 1️⃣ Import and Initialize

#### For TypeScript
```typescript
import { BigQueryClient } from "bigquery-client";

const client = new BigQueryClient({
  projectId: "your-project-id",
  datasetId: "your-dataset-id",
  enableLogging: true,
});
```

#### For JavaScript
```javascript
const { BigQueryClient } = require("bigquery-client");

const client = new BigQueryClient({
  projectId: "your-project-id",
  datasetId: "your-dataset-id",
  enableLogging: true,
});
```

## 📚 Functionality Overview

| Functionality | Description |
|--------------|-------------|
| `query(sql, params?)` | Execute a raw SQL query |
| `explain(sql, params?)` | Perform a dry-run and get execution plan |
| `select(options)` | Perform a `SELECT` query with filtering |
| `insert(options)` | Insert rows into BigQuery tables |
| `update(options)` | Update existing rows in a table |
| `delete(options)` | Delete rows from a table |
| `merge(options)` | Perform an `UPSERT` operation |
| `join(table, on, type)` | Perform INNER, LEFT, RIGHT, FULL JOIN |
| `batchInsert(table, rows)` | Insert multiple rows in a single batch |
| `streamInsert(table, rows)` | Stream rows into BigQuery |
| `flattenResults(results)` | Flatten nested query results |
| Advanced Query Features	| 🚀 |
| `Transaction.addQuery(query, params)` | Add a query to a transaction |
| `Transaction.execute()` | Execute all queries in a transaction |
| `selectDistinct(columns)` | Select `DISTINCT` values |
| `selectAggregate({func, column})` | Use `SUM()`, `AVG()`, `COUNT()` |
| `selectWindowFunction(func, partitionBy, orderBy, alias)` | Use `ROW_NUMBER()`, `RANK()` |
| `selectJsonField(column, jsonPath, alias)` | Extract JSON field |
| `whereLike(column, pattern)` | SQL `LIKE` filtering |
| `whereNotLike(column, pattern)` | SQL `NOT LIKE` filtering |
| `whereBetween(column, min, max)` | SQL `BETWEEN` filtering |
| `whereArray(column, values)` | SQL `IN` with array values |
| `tableSample(percentage)` | Sample a percentage of the table |


## ⚙️ Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `projectId` | string | Your Google Cloud project ID. |
| `datasetId` | string | The BigQuery dataset ID. |
| `enableLogging` | boolean | Logs queries and errors when set to `true`. |



## 🔥 Detailed Functionality

### ✅ 1. Running a SQL Query
```typescript
const result = await client.query("SELECT * FROM users");
console.log(result);
```

### ✅ 2. Explain a Query
```typescript
const explainData = await client.explain("SELECT * FROM users WHERE id = ?", [1]);
console.log(explainData);
```

### ✅ 3. SELECT with Query Builder
```typescript
const response = await client.select({
  table: 'users',
  columns: ['id', 'name', 'email'],
  where: { user_id: 1 }
});
```

### ✅ 4. INSERT Data
```typescript
await client.insert({
  table: "users",
  rows: [{ id: 1, name: "John Doe", email: "john@example.com" }],
});
```

### ✅ 5. UPDATE Data
```typescript
await client.update({
  table: "users",
  set: { email: "newemail@example.com" },
  where: { id: 1 },
});
```

### ✅ 6. DELETE Data
```typescript
await client.delete({
  table: "users",
  where: { id: 1 },
});
```

### ✅ 7. MERGE (UPSERT) Queries
```typescript
await client.merge({
  targetTable: "users",
  sourceTable: "incoming_users",
  on: { "users.id": "incoming_users.id" },
  whenMatched: "UPDATE SET users.name = incoming_users.name",
  whenNotMatched: "INSERT (id, name) VALUES (incoming_users.id, incoming_users.name)",
});
```

### ✅ 8. Batch Insert
```typescript
await client.batchInsert("users", [
  { id: 1, name: "John Doe" },
  { id: 2, name: "Jane Doe" },
]);
```

### ✅ 9. Streaming Insert
```typescript
await client.streamInsert("users", [{ id: 3, name: "Alice" }]);
```

### ✅ 10. Transactions
```typescript
const transaction = new Transaction(client);
transaction.addQuery("INSERT INTO users (id, name) VALUES (?, ?)", [1, "John Doe"]);
transaction.addQuery("UPDATE users SET name = ? WHERE id = ?", ["John Smith", 1]);
await transaction.execute();
```

### ✅ 11. Logging & Debugging
If `enableLogging: true`, all queries and errors are logged:

```sh
Executing query: SELECT * FROM users
```

### ✅ 12. Aggregate Functions
### ✅ 12. Aggregate Functions
#### 1) SUM
```typescript
const response = await client.select({
  table: "transactions",
  columns: ["SUM(price) AS total_price"],
  limit: 5
});
```
#### 2) COUNT
```typescript
const response = await client.select({
  table: "transactions",
  columns: ["COUNT(price)"],
  limit: 5
});
```  

#### 3) AVG
```typescript
const response = await client.select({
  table: "transactions",
  columns: ["users.user_id", "users.name", "AVG(price) AS avg_price"],
  joins: [{ table: "users", on: { "transactions.user_id": "users.user_id" }}],
  groupBy: ["users.user_id", "users.name"],
  orderBy: [{ column: "avg_price", direction: "DESC" }],
  limit: 5
});
```   
#### 4) GROUP BY, ORDER BY, LIMIT  
```typescript
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
  groupBy: [
    'users.user_id', 
    'users.name', 
    'transactions.product', 
    'orders.order_id'
  ],
  orderBy: [
    { 
      column: 'total_price', 
      direction: 'DESC' 
    }
  ],
  limit: 5
});
```
### ✅ 13. JSON Field Extraction
```typescript
const qb = await client.select({
  table: "users",
}).selectJsonField("metadata", "preferences.theme", "user_theme");

```

### ✅ 13. CASE Statements
```typescript
const qb = await client.select({
  table: "orders",
}).case("status", [
  { when: "completed", then: "Done" },
  { when: "pending", then: "Processing" },
], "Unknown", "order_status");


``` 

### ✅ 13. Filtering with Arrays
```typescript
const qb = await client.select({
  table: "users",
}).whereArray("id", [1, 2, 3, 4, 5]);

```

### 🔗 JOIN Queries 

### ✅ 1. INNER JOIN
```typescript
const qb = await client.select({
  table: "users",
  columns: ["users.id", "users.name", "orders.amount"],
  joins: [
    {
      table: "orders",
      on: { "users.id": "orders.user_id" },
      type: "INNER",
    },
  ],
});

```

### ✅ 2. LEFT JOIN
```typescript
const qb = await client.select({
  table: "users",
  columns: ["users.id", "users.name", "orders.amount"],
  joins: [
    {
      table: "orders",
      on: { "users.id": "orders.user_id" },
      type: "LEFT",
    },
  ],
});

```

### ✅ 3. RIGHT JOIN
```typescript
const qb = await client.select({
  table: "users",
  columns: ["users.id", "users.name", "orders.amount"],
  joins: [
    {
      table: "orders",
      on: { "users.id": "orders.user_id" },
      type: "RIGHT",
    },
  ],
});

```

### ✅ 4. FULL JOIN
```typescript
const qb = await client.select({
  table: "users",
  columns: ["users.id", "users.name", "orders.amount"],
  joins: [
    {
      table: "orders",
      on: { "users.id": "orders.user_id" },
      type: "FULL",
    },
  ],
});

```

## 🛠️ Build & Publish

### 🔧 Build
To build the package before publishing:

```sh
npm run build
```

### 📦 Minified Build
This package automatically generates a minified version:

```sh
dist/index.min.js
```

### 🚀 Publish to NPM
To publish the package:

```sh
npm publish --access public
```

## 📝 License

This project is licensed under the MIT License.

MIT © 2025 [Pravin Jadhav](https://github.com/pravinjadhav7)
    

## 🤝 Contributing

Contributions are welcome! Feel free to:

- Submit bug reports and feature requests.
- Fork the project and submit pull requests.


## 🔗 Links

- **GitHub Repository:** [https://github.com/pravinjadhav7/bigquery-client](https://github.com/pravinjadhav7/bigquery-client)
- **NPM Package:** [https://www.npmjs.com/package/bigquery-client](https://www.npmjs.com/package/bigquery-client)

🚀 Happy Querying with BigQuery Client!