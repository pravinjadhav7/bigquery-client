# Troubleshooting Guide

This guide helps you resolve common issues when working with the BigQuery Client ORM.

## 🔧 Installation Issues

### Dependency Conflicts

**Problem**: NPM install fails with peer dependency conflicts
```bash
npm error ERESOLVE could not resolve
```

**Solution**: Use the legacy peer deps flag
```bash
npm install --legacy-peer-deps
```

**Alternative**: Use npm v6 or yarn
```bash
npm install -g npm@6
npm install
```

### TypeScript Version Conflicts

**Problem**: TypeScript version mismatch errors
```bash
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```

**Solution**: Ensure compatible TypeScript version
```bash
npm install typescript@^5.0.0 --save-dev
```

## 🏗️ Build Issues

### GitHub Actions Build Failures

**Problem**: CI/CD pipeline fails at "Install Dependencies" step

**Solution**: The workflows now include `--legacy-peer-deps` flag. If you're still having issues:

1. **Check Node.js version compatibility**:
   ```yaml
   - name: Setup Node.js
     uses: actions/setup-node@v4
     with:
       node-version: 20  # Use LTS version
   ```

2. **Clear npm cache**:
   ```yaml
   - name: Clear npm cache
     run: npm cache clean --force
   ```

3. **Use specific npm version**:
   ```yaml
   - name: Install specific npm version
     run: npm install -g npm@9
   ```

### Local Build Failures

**Problem**: `npm run build` fails locally

**Solution**:
1. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   ```

2. Check TypeScript configuration:
   ```bash
   npx tsc --noEmit  # Check for type errors
   ```

3. Verify all dependencies are installed:
   ```bash
   npm ls  # Check dependency tree
   ```

## 🧪 Testing Issues

### Jest Configuration Problems

**Problem**: Tests fail to run or can't find modules

**Solution**: Ensure Jest is configured correctly in `package.json`:
```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"]
  }
}
```

### Mock Issues

**Problem**: BigQuery client mocking fails in tests

**Solution**: Use proper mocking setup:
```typescript
jest.mock('@google-cloud/bigquery', () => ({
  BigQuery: jest.fn().mockImplementation(() => ({
    dataset: jest.fn().mockReturnValue({
      table: jest.fn().mockReturnValue({
        insert: jest.fn().mockResolvedValue([{}])
      })
    })
  }))
}));
```

## 🔐 Authentication Issues

### Service Account Problems

**Problem**: Authentication fails with service account

**Solution**:
1. Verify service account key file path:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
   ```

2. Check service account permissions:
   - BigQuery Data Editor
   - BigQuery Job User
   - BigQuery User

3. Validate JSON key file format:
   ```bash
   cat service-account.json | jq .  # Should parse without errors
   ```

### Environment Variable Issues

**Problem**: Environment variables not loaded

**Solution**:
1. Use dotenv for local development:
   ```typescript
   import dotenv from 'dotenv';
   dotenv.config();
   ```

2. Verify environment variables:
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   echo $GOOGLE_CLOUD_PROJECT
   ```

## 📦 NPM Publishing Issues

### Publishing Failures

**Problem**: `npm publish` fails

**Solution**:
1. Ensure you're logged in:
   ```bash
   npm whoami
   npm login
   ```

2. Check package version:
   ```bash
   npm version patch  # Increment version
   ```

3. Verify package contents:
   ```bash
   npm pack --dry-run
   ```

### Registry Issues

**Problem**: Package not appearing on NPM

**Solution**:
1. Check registry configuration:
   ```bash
   npm config get registry
   npm config set registry https://registry.npmjs.org/
   ```

2. Verify package.json publishConfig:
   ```json
   {
     "publishConfig": {
       "access": "public",
       "registry": "https://registry.npmjs.org/"
     }
   }
   ```

## 🚀 Runtime Issues

### BigQuery Connection Problems

**Problem**: Cannot connect to BigQuery

**Solution**:
1. Verify project ID and dataset:
   ```typescript
   const client = new BigQueryClient({
     projectId: 'your-actual-project-id',
     datasetId: 'your-actual-dataset-id'
   });
   ```

2. Test connection:
   ```typescript
   try {
     await client.query('SELECT 1 as test');
     console.log('Connection successful');
   } catch (error) {
     console.error('Connection failed:', error);
   }
   ```

### Query Execution Errors

**Problem**: Queries fail with syntax errors

**Solution**:
1. Enable logging to see actual queries:
   ```typescript
   const client = new BigQueryClient({
     enableLogging: true,
     logLevel: 'debug'
   });
   ```

2. Validate table and column names:
   ```sql
   SELECT column_name 
   FROM `project.dataset.INFORMATION_SCHEMA.COLUMNS` 
   WHERE table_name = 'your_table'
   ```

## 🔍 Debugging Tips

### Enable Debug Logging

```typescript
const client = new BigQueryClient({
  enableLogging: true,
  logLevel: 'debug'
});
```

### Check Package Version

```bash
npm list bigquery-client
```

### Verify Dependencies

```bash
npm audit
npm outdated
```

### Test in Isolation

Create a minimal test file:
```typescript
import { BigQueryClient } from 'bigquery-client';

async function test() {
  const client = new BigQueryClient({
    projectId: process.env.GOOGLE_CLOUD_PROJECT!,
    datasetId: 'test_dataset'
  });
  
  try {
    const result = await client.query('SELECT 1 as test');
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
```

## 📞 Getting Help

If you're still experiencing issues:

1. **Check GitHub Issues**: [https://github.com/pravinjadhav7/bigquery-client/issues](https://github.com/pravinjadhav7/bigquery-client/issues)
2. **Create New Issue**: Include error messages, environment details, and reproduction steps
3. **Check Documentation**: Review the [Architecture Guide](./ARCHITECTURE.md) and [Migration Guide](./MIGRATION_GUIDE.md)

## 🔄 Common Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Dependency conflicts | `npm install --legacy-peer-deps` |
| Build failures | Clear node_modules, reinstall |
| Test failures | Check Jest configuration |
| Auth issues | Verify service account and permissions |
| CI/CD failures | Use updated workflows with legacy-peer-deps |
| Publishing issues | Check npm login and version |

---

**Need more help?** Open an issue on [GitHub](https://github.com/pravinjadhav7/bigquery-client/issues) with detailed information about your problem. 