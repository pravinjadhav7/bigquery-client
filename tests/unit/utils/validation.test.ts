import { QueryValidator } from '../../../src/lib/validation/validation';
import { ValidationError } from '../../../src/errors';

describe('QueryValidator', () => {
  describe('Query Validation', () => {
    it('should accept valid queries', () => {
      const validQueries = [
        'SELECT * FROM users',
        'SELECT id, name FROM users WHERE age > 18',
        'INSERT INTO users (name, age) VALUES (?, ?)',
        'UPDATE users SET name = ? WHERE id = ?',
        'DELETE FROM users WHERE id = ?'
      ];

      validQueries.forEach(query => {
        expect(() => QueryValidator.validateQuery(query)).not.toThrow();
      });
    });

    it('should reject empty queries', () => {
      expect(() => QueryValidator.validateQuery('')).toThrow(ValidationError);
    });

    it('should detect SQL injection patterns', () => {
      const invalidQueries = [
        'SELECT * FROM users; DROP TABLE users;',
        'SELECT * FROM users UNION SELECT password FROM passwords',
        'SELECT * FROM users; EXEC(\'rm -rf /\')',
        'SELECT * FROM users; WAITFOR DELAY \'0:0:10\'',
        'SELECT * FROM users; ALTER TABLE users DROP COLUMN password',
        'SELECT * FROM users WHERE name = \'\' OR \'1\'=\'1\'',
        'SELECT * FROM users WHERE id = 1; DROP TABLE users'
      ];

      invalidQueries.forEach(query => {
        expect(() => QueryValidator.validateQuery(query)).toThrow(ValidationError);
      });
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', () => {
      const validParams = [
        [1, 'test'],
        ['John', 30],
        [true, false],
        [new Date(), 'string']
      ];

      validParams.forEach(params => {
        expect(() => QueryValidator.validateParameters(params)).not.toThrow();
      });
    });

    it('should reject non-array parameters', () => {
      expect(() => QueryValidator.validateParameters('not an array' as any)).toThrow(ValidationError);
    });

    it('should reject parameters containing undefined or null', () => {
      const invalidParams = [
        [undefined],
        [null],
        [1, undefined, 3],
        [1, null, 3]
      ];

      invalidParams.forEach(params => {
        expect(() => QueryValidator.validateParameters(params)).toThrow(ValidationError);
      });
    });
  });

  describe('Schema Validation', () => {
    it('should accept valid schemas', () => {
      const validSchemas = [
        {
          name: 'string',
          age: 'number',
          active: 'boolean'
        },
        {
          id: 'number',
          created_at: 'timestamp',
          metadata: 'json'
        }
      ];

      validSchemas.forEach(schema => {
        expect(() => QueryValidator.validateSchema(schema)).not.toThrow();
      });
    });

    it('should reject invalid schemas', () => {
      const invalidSchemas = [
        null,
        undefined,
        'not an object',
        123,
        []
      ];

      invalidSchemas.forEach(schema => {
        expect(() => QueryValidator.validateSchema(schema as any)).toThrow(ValidationError);
      });
    });
  });
}); 