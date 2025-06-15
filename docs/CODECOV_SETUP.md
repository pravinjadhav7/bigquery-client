# Codecov Setup Guide

This guide explains how to set up Codecov for code coverage reporting in the BigQuery Client ORM project.

## 🎯 Overview

Codecov provides detailed code coverage reports and integrates seamlessly with our GitHub Actions CI/CD pipeline. It helps maintain code quality by tracking test coverage across all commits and pull requests.

## 🔧 Setup Instructions

### 1. **Sign up for Codecov**

1. Go to [codecov.io](https://codecov.io)
2. Sign in with your GitHub account
3. Grant necessary permissions to access your repositories

### 2. **Add Repository to Codecov**

1. Navigate to your Codecov dashboard
2. Click "Add new repository"
3. Find and select `pravinjadhav7/bigquery-client`
4. Copy the repository upload token

### 3. **Configure GitHub Secrets**

1. Go to your GitHub repository: `https://github.com/pravinjadhav7/bigquery-client`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secret:
   - **Name**: `CODECOV_TOKEN`
   - **Value**: [Your Codecov upload token]

### 4. **Verify Integration**

The GitHub Actions workflow is already configured to upload coverage reports. After setting up the token:

1. Push changes to trigger the CI workflow
2. Check the "Upload Coverage to Codecov" step in GitHub Actions
3. Visit your Codecov dashboard to see coverage reports

## 📊 Coverage Configuration

Our project uses the following coverage configuration (`codecov.yml`):

```yaml
coverage:
  status:
    project:
      default:
        target: 70%        # Overall project coverage target
        threshold: 1%      # Allow 1% decrease
    patch:
      default:
        target: 80%        # New code coverage target
        threshold: 1%      # Allow 1% decrease
```

## 🎯 Coverage Targets

- **Project Coverage**: Minimum 70% overall coverage
- **Patch Coverage**: Minimum 80% coverage for new code
- **Precision**: 2 decimal places
- **Range**: 70-100% (anything below 70% is considered poor)

## 📈 Coverage Reports

Codecov provides several types of reports:

### **1. Project Coverage**
- Overall percentage of code covered by tests
- Trend analysis over time
- File-by-file breakdown

### **2. Patch Coverage**
- Coverage of new code in pull requests
- Helps maintain quality for new features
- Prevents coverage regression

### **3. Pull Request Comments**
- Automatic comments on PRs with coverage changes
- Diff coverage highlighting uncovered lines
- Visual coverage reports

## 🔍 Interpreting Coverage Reports

### **Coverage Badge**
```markdown
[![codecov](https://codecov.io/gh/pravinjadhav7/bigquery-client/branch/main/graph/badge.svg)](https://codecov.io/gh/pravinjadhav7/bigquery-client)
```

### **Coverage Levels**
- 🟢 **90-100%**: Excellent coverage
- 🟡 **70-89%**: Good coverage
- 🟠 **50-69%**: Fair coverage
- 🔴 **Below 50%**: Poor coverage

## 📁 Ignored Files

The following files/directories are excluded from coverage:

```yaml
ignore:
  - "dist/**/*"          # Built files
  - "coverage/**/*"      # Coverage reports
  - "node_modules/**/*"  # Dependencies
  - "**/*.test.ts"       # Test files
  - "**/*.spec.ts"       # Spec files
  - "examples/**/*"      # Example code
  - "docs/**/*"          # Documentation
```

## 🚀 GitHub Actions Integration

Our CI workflow automatically:

1. **Runs Tests**: Executes Jest with coverage collection
2. **Generates Reports**: Creates LCOV coverage files
3. **Uploads to Codecov**: Sends coverage data to Codecov
4. **Updates Status**: Shows coverage status on PRs

### **Workflow Configuration**

```yaml
- name: Run Tests with Coverage
  run: npm run test:coverage

- name: Upload Coverage to Codecov
  uses: codecov/codecov-action@v5
  if: matrix.node-version == 20
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    file: ./coverage/lcov.info
    flags: unittests
    name: codecov-umbrella
```

## 🔧 Local Coverage Testing

To generate coverage reports locally:

```bash
# Run tests with coverage
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

## 📋 Coverage Commands

| Command | Description |
|---------|-------------|
| `npm run test:coverage` | Run tests with coverage |
| `npm run test:ci` | Run tests in CI mode with coverage |
| `npm run test:watch` | Run tests in watch mode |

## 🎯 Best Practices

### **1. Write Comprehensive Tests**
- Test all public methods and functions
- Include edge cases and error scenarios
- Test both success and failure paths

### **2. Maintain Coverage Standards**
- Aim for 80%+ coverage on new code
- Don't sacrifice test quality for coverage percentage
- Focus on testing critical business logic

### **3. Review Coverage Reports**
- Check coverage before merging PRs
- Identify untested code paths
- Add tests for critical uncovered code

### **4. Use Coverage as a Guide**
- 100% coverage doesn't guarantee bug-free code
- Focus on meaningful tests, not just coverage numbers
- Use coverage to identify gaps in testing

## 🔍 Troubleshooting

### **Common Issues**

1. **Coverage Not Uploading**
   - Check `CODECOV_TOKEN` is set correctly
   - Verify GitHub Actions workflow permissions
   - Check for network connectivity issues

2. **Low Coverage Warnings**
   - Review uncovered code in Codecov dashboard
   - Add tests for critical uncovered paths
   - Consider adjusting coverage targets if appropriate

3. **Badge Not Updating**
   - Clear browser cache
   - Check repository URL in badge
   - Verify Codecov integration is active

### **Getting Help**

- **Codecov Documentation**: [docs.codecov.io](https://docs.codecov.io)
- **GitHub Issues**: [Report issues](https://github.com/pravinjadhav7/bigquery-client/issues)
- **Codecov Support**: [support@codecov.io](mailto:support@codecov.io)

---

**🎉 With Codecov properly configured, you'll have comprehensive coverage tracking and reporting for your BigQuery Client ORM!** 