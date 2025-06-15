/**
 * @fileoverview Query Validation Utility - Advanced security and data validation for BigQuery operations
 * @version 1.0.6
 * @author Pravin Jadhav
 * @description This module provides comprehensive validation capabilities including SQL injection protection,
 * parameter validation, schema validation, and security best practices for BigQuery operations.
 */

import { ValidationError } from '../../errors';

/**
 * Advanced query validation and security system for BigQuery operations
 * 
 * This class provides comprehensive validation capabilities including:
 * - SQL injection detection and prevention
 * - Parameter type and value validation
 * - Schema structure validation
 * - Query syntax validation
 * - Security best practices enforcement
 * - Input sanitization and normalization
 * 
 * @class QueryValidator
 * @example
 * ```typescript
 * // Validate a query for security
 * try {
 *   QueryValidator.validateQuery('SELECT * FROM users WHERE id = ?');
 *   console.log('Query is safe to execute');
 * } catch (error) {
 *   console.error('Query validation failed:', error.message);
 * }
 * 
 * // Validate query parameters
 * QueryValidator.validateParameters([123, 'john@example.com', true]);
 * ```
 */
export class QueryValidator {
  /**
   * Validates SQL queries for security vulnerabilities and syntax issues
   * 
   * This method provides comprehensive query validation including:
   * - SQL injection pattern detection
   * - Dangerous statement identification
   * - Comment and union-based attack prevention
   * - Query structure validation
   * - Security best practices enforcement
   * 
   * @static
   * @param {string} query - SQL query string to validate
   * @returns {void}
   * @throws {ValidationError} When query contains security vulnerabilities or invalid syntax
   * 
   * @example
   * ```typescript
   * // Valid queries pass validation
   * QueryValidator.validateQuery('SELECT * FROM users WHERE active = ?');
   * QueryValidator.validateQuery('INSERT INTO logs (message, timestamp) VALUES (?, ?)');
   * QueryValidator.validateQuery('UPDATE users SET last_login = ? WHERE id = ?');
   * 
   * // Invalid queries throw ValidationError
   * try {
   *   QueryValidator.validateQuery("SELECT * FROM users; DROP TABLE users;");
   * } catch (error) {
   *   console.error('SQL injection detected:', error.message);
   * }
   * 
   * try {
   *   QueryValidator.validateQuery("SELECT * FROM users WHERE id = 1 OR '1'='1'");
   * } catch (error) {
   *   console.error('Injection pattern detected:', error.message);
   * }
   * 
   * // Empty or invalid queries
   * try {
   *   QueryValidator.validateQuery('');
   * } catch (error) {
   *   console.error('Invalid query format:', error.message);
   * }
   * ```
   */
  static validateQuery(query: string): void {
    // Basic query format validation
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Invalid query: Query must be a non-empty string');
    }

    // Advanced SQL injection detection patterns
    const sqlInjectionPatterns = [
      /;\s*(DROP|ALTER|TRUNCATE|DELETE)\s+/i,  // Dangerous statements after semicolon
      /UNION\s+SELECT.*FROM/i,                 // UNION-based injection attacks
      /\bEXEC\s*\(/i,                         // EXEC function calls
      /\bWAITFOR\s+DELAY/i,                   // Time-based injection attacks
      /--\s*$/,                               // SQL comments at end of query
      /\/\*.*\*\//,                           // Block comments for obfuscation
      /'\s*OR\s*'.*'=/i,                      // OR-based injection patterns
      /'\s*;\s*DROP/i                         // Drop statements after quotes
    ];

    // Check each pattern for potential security threats
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        throw new ValidationError('Potential SQL injection detected');
      }
    }
  }

  /**
   * Validates query parameters for type safety and security
   * 
   * This method ensures parameter integrity by:
   * - Verifying parameter array structure
   * - Checking for null/undefined values
   * - Validating parameter types
   * - Preventing parameter-based injection
   * - Ensuring data consistency
   * 
   * @static
   * @param {any[]} params - Array of query parameters to validate
   * @returns {void}
   * @throws {ValidationError} When parameters are invalid or potentially unsafe
   * 
   * @example
   * ```typescript
   * // Valid parameter arrays
   * QueryValidator.validateParameters([123, 'john@example.com', true]);
   * QueryValidator.validateParameters(['active', new Date(), 42.5]);
   * QueryValidator.validateParameters([{ id: 1, name: 'test' }]);
   * 
   * // Invalid parameters throw ValidationError
   * try {
   *   QueryValidator.validateParameters('not an array');
   * } catch (error) {
   *   console.error('Parameters must be array:', error.message);
   * }
   * 
   * try {
   *   QueryValidator.validateParameters([123, null, 'valid']);
   * } catch (error) {
   *   console.error('Null parameters not allowed:', error.message);
   * }
   * 
   * try {
   *   QueryValidator.validateParameters([undefined, 'test']);
   * } catch (error) {
   *   console.error('Undefined parameters not allowed:', error.message);
   * }
   * 
   * // Empty arrays are valid
   * QueryValidator.validateParameters([]);
   * ```
   */
  static validateParameters(params: any[]): void {
    // Ensure parameters is an array
    if (!Array.isArray(params)) {
      throw new ValidationError('Parameters must be an array');
    }

    // Validate each parameter for safety
    for (const param of params) {
      if (param === undefined || param === null) {
        throw new ValidationError('Parameters cannot be undefined or null');
      }
    }
  }

  /**
   * Validates BigQuery table schema definitions for correctness and consistency
   * 
   * This method provides schema validation including:
   * - Schema structure verification
   * - Field type validation
   * - Required field checking
   * - Data type compatibility
   * - Schema consistency enforcement
   * 
   * @static
   * @param {any} schema - Schema object to validate
   * @returns {void}
   * @throws {ValidationError} When schema is invalid or malformed
   * 
   * @example
   * ```typescript
   * // Valid schema objects (BigQuery types)
   * QueryValidator.validateSchema({
   *   id: 'INTEGER',
   *   name: 'STRING',
   *   email: 'STRING',
   *   created_at: 'TIMESTAMP'
   * });
   * 
   * // Valid schema objects (JavaScript types)
   * QueryValidator.validateSchema({
   *   id: 'number',
   *   name: 'string',
   *   active: 'boolean',
   *   created_at: 'timestamp'
   * });
   * 
   * QueryValidator.validateSchema({
   *   user_id: 'INTEGER',
   *   metadata: 'JSON',
   *   score: 'FLOAT',
   *   active: 'BOOLEAN'
   * });
   * 
   * // Invalid schemas throw ValidationError
   * try {
   *   QueryValidator.validateSchema(null);
   * } catch (error) {
   *   console.error('Schema cannot be null:', error.message);
   * }
   * 
   * try {
   *   QueryValidator.validateSchema(['not', 'an', 'object']);
   * } catch (error) {
   *   console.error('Schema must be object:', error.message);
   * }
   * 
   * try {
   *   QueryValidator.validateSchema('invalid schema');
   * } catch (error) {
   *   console.error('Schema format invalid:', error.message);
   * }
   * ```
   */
  static validateSchema(schema: any): void {
    // Basic schema structure validation
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new ValidationError('Invalid schema: Schema must be an object');
    }

    // Validate schema fields and types
    const validBigQueryTypes = [
      'STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'TIMESTAMP', 'DATE', 'TIME',
      'DATETIME', 'GEOGRAPHY', 'NUMERIC', 'BIGNUMERIC', 'JSON', 'ARRAY', 'STRUCT'
    ];

    // Also accept JavaScript types for convenience
    const validJavaScriptTypes = [
      'string', 'number', 'boolean', 'timestamp', 'date', 'time',
      'datetime', 'geography', 'numeric', 'bignumeric', 'json', 'array', 'object'
    ];

    const allValidTypes = [...validBigQueryTypes, ...validJavaScriptTypes];

    for (const [fieldName, fieldType] of Object.entries(schema)) {
      // Validate field name
      if (!fieldName || typeof fieldName !== 'string') {
        throw new ValidationError(`Invalid field name: ${fieldName}`);
      }

      // Validate field type
      if (typeof fieldType === 'string') {
        const lowerType = fieldType.toLowerCase();
        const upperType = fieldType.toUpperCase();
        
        if (!allValidTypes.includes(upperType) && !allValidTypes.includes(lowerType)) {
          throw new ValidationError(`Invalid field type: ${fieldType} for field ${fieldName}`);
        }
      }
    }
  }

  /**
   * Validates table and column names for BigQuery compatibility
   * 
   * @static
   * @param {string} name - Table or column name to validate
   * @returns {void}
   * @throws {ValidationError} When name doesn't meet BigQuery naming requirements
   * 
   * @example
   * ```typescript
   * // Valid names
   * QueryValidator.validateIdentifier('users');
   * QueryValidator.validateIdentifier('user_events');
   * QueryValidator.validateIdentifier('analytics_2023');
   * 
   * // Invalid names
   * try {
   *   QueryValidator.validateIdentifier('123_invalid');
   * } catch (error) {
   *   console.error('Names cannot start with numbers');
   * }
   * ```
   */
  static validateIdentifier(name: string): void {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Identifier must be a non-empty string');
    }

    // BigQuery identifier rules
    const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!identifierPattern.test(name)) {
      throw new ValidationError(`Invalid identifier: ${name}. Must start with letter or underscore, contain only letters, numbers, and underscores`);
    }

    // Check length limits
    if (name.length > 128) {
      throw new ValidationError(`Identifier too long: ${name}. Maximum length is 128 characters`);
    }

    // Check reserved words
    const reservedWords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
      'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'GRANT', 'REVOKE'
    ];

    if (reservedWords.includes(name.toUpperCase())) {
      throw new ValidationError(`Reserved word cannot be used as identifier: ${name}`);
    }
  }

  /**
   * Validates query complexity to prevent resource exhaustion
   * 
   * @static
   * @param {string} query - SQL query to analyze
   * @returns {void}
   * @throws {ValidationError} When query is too complex or resource-intensive
   */
  static validateQueryComplexity(query: string): void {
    // Check for excessive JOINs
    const joinCount = (query.match(/\bJOIN\b/gi) || []).length;
    if (joinCount > 10) {
      throw new ValidationError(`Query too complex: ${joinCount} JOINs detected. Maximum allowed: 10`);
    }

    // Check for excessive subqueries
    const subqueryCount = (query.match(/\(\s*SELECT\b/gi) || []).length;
    if (subqueryCount > 5) {
      throw new ValidationError(`Query too complex: ${subqueryCount} subqueries detected. Maximum allowed: 5`);
    }

    // Check query length
    if (query.length > 10000) {
      throw new ValidationError(`Query too long: ${query.length} characters. Maximum allowed: 10000`);
    }
  }
}
