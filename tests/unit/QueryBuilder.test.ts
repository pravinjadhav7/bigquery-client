import { QueryBuilder } from '../../src/core/QueryBuilder';

describe('QueryBuilder', () => {
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    queryBuilder = new QueryBuilder('users');
  });

  describe('SELECT Queries', () => {
    it('should build basic SELECT query', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name', 'email'])
        .build();

      expect(query).toBe('SELECT id, name, email FROM users');
      expect(params).toHaveLength(0);
    });

    it('should build SELECT query with WHERE clause', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .where({ age: 18, active: true })
        .build();

      expect(query).toBe('SELECT id, name FROM users WHERE age = ? AND active = ?');
      expect(params).toEqual([18, true]);
    });

    it('should build SELECT query with JOIN', () => {
      const { query, params } = queryBuilder
        .select(['users.id', 'users.name', 'orders.order_id'])
        .join('orders', { 'users.id': 'orders.user_id' })
        .build();

      expect(query).toBe('SELECT users.id, users.name, orders.order_id FROM users INNER JOIN orders ON users.id = orders.user_id');
      expect(params).toHaveLength(0);
    });

    it('should build SELECT query with GROUP BY and ORDER BY', () => {
      const { query, params } = queryBuilder
        .select(['department', 'COUNT(*) as count'])
        .groupBy(['department'])
        .orderBy([{ column: 'count', direction: 'DESC' }])
        .build();

      expect(query).toBe('SELECT department, COUNT(*) as count FROM users GROUP BY department ORDER BY count DESC');
      expect(params).toHaveLength(0);
    });

    it('should build SELECT query with LIMIT and OFFSET', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .limit(10)
        .offset(20)
        .build();

      expect(query).toBe('SELECT id, name FROM users LIMIT 10 OFFSET 20');
      expect(params).toHaveLength(0);
    });

    it('should build SELECT query with DISTINCT', () => {
      const { query, params } = queryBuilder
        .selectDistinct(['department'])
        .build();

      expect(query).toBe('SELECT DISTINCT department FROM users');
      expect(params).toHaveLength(0);
    });
  });

  describe('INSERT Queries', () => {
    it('should build basic INSERT query', () => {
      const { query, params } = queryBuilder
        .insert([{ name: 'John Doe', email: 'john@example.com', age: 30 }])
        .build();

      expect(query).toBe('INSERT INTO users (name, email, age) VALUES (?, ?, ?)');
      expect(params).toEqual(['John Doe', 'john@example.com', 30]);
    });

    it('should build multi-row INSERT query', () => {
      const { query, params } = queryBuilder
        .insert([
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Doe', email: 'jane@example.com' }
        ])
        .build();

      expect(query).toBe('INSERT INTO users (name, email) VALUES (?, ?), (?, ?)');
      expect(params).toEqual(['John Doe', 'john@example.com', 'Jane Doe', 'jane@example.com']);
    });
  });

  describe('UPDATE Queries', () => {
    it('should build basic UPDATE query', () => {
      const { query, params } = queryBuilder
        .update({ name: 'John Doe', age: 30 })
        .where({ id: 1 })
        .build();

      expect(query).toBe('UPDATE users SET name = ?, age = ? WHERE id = ?');
      expect(params).toEqual(['John Doe', 30, 1]);
    });

    it('should build UPDATE query with multiple conditions', () => {
      const { query, params } = queryBuilder
        .update({ status: 'inactive' })
        .where({ age: 18, active: true })
        .build();

      expect(query).toBe('UPDATE users SET status = ? WHERE age = ? AND active = ?');
      expect(params).toEqual(['inactive', 18, true]);
    });
  });

  describe('DELETE Queries', () => {
    it('should build basic DELETE query', () => {
      const { query, params } = queryBuilder
        .delete()
        .where({ id: 1 })
        .build();

      expect(query).toBe('DELETE FROM users WHERE id = ?');
      expect(params).toEqual([1]);
    });

    it('should build DELETE query with multiple conditions', () => {
      const { query, params } = queryBuilder
        .delete()
        .where({ age: 18, active: false })
        .build();

      expect(query).toBe('DELETE FROM users WHERE age = ? AND active = ?');
      expect(params).toEqual([18, false]);
    });
  });

  describe('Advanced Features', () => {
    it('should build query with table sample', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .tableSample(10)
        .build();

      expect(query).toBe('SELECT id, name FROM users TABLESAMPLE SYSTEM (10)');
      expect(params).toHaveLength(0);
    });

    it('should build query with JSON field condition', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .whereJsonField('metadata', 'preferences.theme', 'dark')
        .build();

      expect(query).toBe('SELECT id, name FROM users WHERE JSON_EXTRACT(metadata, "$.preferences.theme") = ?');
      expect(params).toEqual(['dark']);
    });

    it('should build query with struct field condition', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .whereStructField('address', 'city', 'New York')
        .build();

      expect(query).toBe('SELECT id, name FROM users WHERE address.city = ?');
      expect(params).toEqual(['New York']);
    });

    it('should build query with array contains condition', () => {
      const { query, params } = queryBuilder
        .select(['id', 'name'])
        .whereArrayContains('tags', 'admin')
        .build();

      expect(query).toBe('SELECT id, name FROM users WHERE ARRAY_CONTAINS(?, tags)');
      expect(params).toEqual(['admin']);
    });
  });
}); 