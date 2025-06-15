# Migration Guide - BigQuery Client ORM v1.0.6

## 📁 Folder Structure Changes

The BigQuery Client ORM has been reorganized with a new modular folder structure for better maintainability and scalability. Here's what changed:

### Before (v1.0.5 and earlier)
```
src/
├── BigQueryClient.ts
├── QueryBuilder.ts
├── Logger.ts
├── Pool.ts
├── Transaction.ts
├── constants.ts
├── types/
├── errors/
└── utils/
    ├── cache.ts
    ├── metrics.ts
    └── validation.ts
test/
└── *.test.ts
```

### After (v1.0.6+)
```
src/
├── core/                     # Core functionality
│   ├── BigQueryClient.ts
│   ├── QueryBuilder.ts
│   ├── Pool.ts
│   ├── Transaction.ts
│   └── index.ts
├── lib/                      # Library utilities
│   ├── cache/
│   │   ├── cache.ts
│   │   └── index.ts
│   ├── metrics/
│   │   ├── metrics.ts
│   │   └── index.ts
│   ├── validation/
│   │   ├── validation.ts
│   │   └── index.ts
│   └── logging/
│       ├── Logger.ts
│       └── index.ts
├── config/                   # Configuration
│   ├── constants.ts
│   └── index.ts
├── types/
├── errors/
└── index.ts
tests/                        # Renamed from 'test'
├── unit/
├── integration/
└── fixtures/
```

## 🔄 Import Changes

### Public API (No Breaking Changes)
The public API remains unchanged. All imports from the main package continue to work:

```typescript
// ✅ These imports still work exactly the same
import { BigQueryClient } from 'bigquery-client';
import { BigQueryClient, QueryBuilder, Logger } from 'bigquery-client';
```

### Internal Imports (For Contributors)
If you were importing internal modules directly (not recommended), update your imports:

```typescript
// ❌ Old internal imports (no longer work)
import { BigQueryClient } from 'bigquery-client/src/BigQueryClient';
import { QueryCache } from 'bigquery-client/src/utils/cache';

// ✅ New internal imports (if needed)
import { BigQueryClient } from 'bigquery-client/src/core/BigQueryClient';
import { QueryCache } from 'bigquery-client/src/lib/cache/cache';
```

## 📦 Module Organization

### Core Module
Contains the main business logic:
- `BigQueryClient` - Main ORM class
- `QueryBuilder` - SQL query construction
- `Pool` - Connection pooling
- `Transaction` - Transaction management

### Library Module
Utility libraries organized by functionality:
- `lib/cache/` - Query result caching
- `lib/metrics/` - Performance monitoring
- `lib/validation/` - Input validation and security
- `lib/logging/` - Logging functionality

### Configuration Module
- `config/constants.ts` - Application constants
- `types/` - TypeScript type definitions
- `errors/` - Custom error classes

## 🧪 Testing Changes

### Test Directory Structure
- Tests moved from `test/` to `tests/`
- Organized into `unit/`, `integration/`, and `fixtures/`
- All test functionality remains the same

### Running Tests
No changes to test commands:
```bash
npm test                # Run all tests
npm run test:coverage   # Run with coverage
npm run test:watch      # Watch mode
```

## 🚀 Benefits of New Structure

### 1. **Better Organization**
- Clear separation between core functionality and utilities
- Logical grouping of related modules
- Easier to navigate and understand

### 2. **Improved Maintainability**
- Modular architecture with clear boundaries
- Easier to add new features without affecting existing code
- Better dependency management

### 3. **Enhanced Developer Experience**
- More intuitive file organization
- Better IDE support with module-based structure
- Clearer documentation and examples

### 4. **Future-Proof Architecture**
- Scalable structure for adding new features
- Supports tree-shaking for smaller bundle sizes
- Better support for micro-frontend architectures

## 🔧 Development Workflow Changes

### Building
No changes to build commands:
```bash
npm run build           # Build the project
npm run clean           # Clean dist folder
```

### Linting and Formatting
Updated to include new test directory:
```bash
npm run lint            # Lint TypeScript files
npm run format          # Format code
```

## 📚 Documentation Updates

### New Documentation
- `docs/ARCHITECTURE.md` - Detailed architecture documentation
- `examples/` - Practical usage examples
- Enhanced README with new structure information

### Updated Guides
- Installation and setup remain the same
- API documentation unchanged
- New examples for advanced features

## 🔄 Backward Compatibility

### ✅ Fully Compatible
- All public APIs remain unchanged
- No breaking changes to existing functionality
- All configuration options work the same way
- Test suites pass without modification

### 📝 Recommended Updates
While not required, consider these improvements:

1. **Update import statements** if using internal modules
2. **Review test organization** for better structure
3. **Update documentation** to reference new structure
4. **Consider new examples** for advanced features

## 🆘 Troubleshooting

### Common Issues

#### Import Errors
If you see import errors after upgrading:
```typescript
// ❌ If this fails
import { SomeInternalClass } from 'bigquery-client/src/SomeFile';

// ✅ Use the public API instead
import { SomeInternalClass } from 'bigquery-client';
```

#### Test Path Issues
If tests aren't found:
```json
// Update Jest configuration in package.json
{
  "jest": {
    "testMatch": ["**/tests/**/*.test.ts"]
  }
}
```

#### Build Issues
If build fails:
```bash
# Clean and rebuild
npm run clean
npm run build
```

### Getting Help
- Check the [GitHub Issues](https://github.com/pravinjadhav7/bigquery-client/issues)
- Review the [Architecture Documentation](./ARCHITECTURE.md)
- Look at the [Examples](../examples/)

## 🎯 Next Steps

1. **Update your project** to v1.0.6
2. **Test your existing code** (should work without changes)
3. **Explore new examples** in the `examples/` directory
4. **Review architecture docs** for better understanding
5. **Consider contributing** to the improved codebase

The new structure provides a solid foundation for future enhancements while maintaining full backward compatibility with existing code. 