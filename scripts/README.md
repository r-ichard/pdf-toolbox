# Test Scripts for PDF Toolbox

This directory contains comprehensive test runners for the PDF Toolbox project.

## Available Test Commands

### Quick Commands (package.json scripts)

```bash
# Basic test commands
npm test                    # Run unit tests in watch mode
npm run test:unit          # Run unit tests once
npm run test:e2e           # Run end-to-end tests
npm run lint               # Run ESLint

# Comprehensive test suites
npm run test:all           # Run lint + unit + e2e tests
npm run test:all:coverage  # Run with coverage report
npm run test:all:detailed  # Run with detailed reporting
npm run test:all:verbose   # Run with verbose output
npm run test:all:with-coverage  # Run detailed suite with coverage

# CI/CD
npm run test:ci            # Full CI pipeline: lint + test + build + e2e
```

### Detailed Test Runners

#### 1. Node.js Runner (Cross-platform) - **Recommended**
```bash
node scripts/test-all.js                # Standard run
node scripts/test-all.js --verbose      # Verbose output
node scripts/test-all.js --coverage     # With coverage report
node scripts/test-all.js --help         # Show help
```

#### 2. Bash Runner (Unix/macOS/Linux)
```bash
./scripts/test-all.sh                   # Standard run
```

#### 3. PowerShell Runner (Windows)
```powershell
.\scripts\test-all.ps1                  # Standard run
.\scripts\test-all.ps1 -Verbose         # Verbose output
```

## Test Phases

All comprehensive test runners execute these phases in order:

### Phase 1: Code Quality & Linting
- **ESLint**: Checks code style, potential bugs, and best practices
- **Purpose**: Ensure consistent code quality

### Phase 2: TypeScript Compilation
- **TypeScript Check**: Validates types without emitting files
- **Purpose**: Catch type errors early

### Phase 3: Unit Tests
- **Vitest**: Runs all unit tests for utilities and components
- **Coverage**: Optional coverage reporting
- **Purpose**: Verify individual function/component behavior

### Phase 4: Build Verification
- **Vite Build**: Creates production build
- **Purpose**: Ensure the app builds successfully for deployment

### Phase 5: End-to-End Tests
- **Playwright**: Tests complete user workflows
- **Purpose**: Verify app works as expected for end users
- **Note**: Only runs if build succeeds

## Test Results

### Success Indicators
- ✅ Green checkmarks for passed tests
- 🎉 All tests passed message
- Exit code 0

### Failure Indicators
- ❌ Red X marks for failed tests
- Summary of failed test names
- Exit code 1

### Warnings
- ⚠️ Yellow warnings for non-critical issues
- Tests continue even with warnings

## CI/CD Integration

For continuous integration, use:
```bash
npm run test:ci
```

This command:
1. Runs linting
2. Executes unit tests (single run)
3. Builds the project
4. Runs e2e tests
5. Exits with appropriate code for CI systems

## Troubleshooting

### Common Issues

**Playwright not installed:**
```bash
npx playwright install
```

**Permission denied on Unix scripts:**
```bash
chmod +x scripts/test-all.sh
chmod +x scripts/test-all.js
```

**Tests failing locally:**
1. Run `npm install` to ensure dependencies are up to date
2. Run individual test suites to isolate issues:
   - `npm run lint`
   - `npm run test:unit`
   - `npm run test:e2e`

### Debug Mode

For debugging failed tests:
```bash
# Verbose output
npm run test:all:verbose

# Run specific test types
npm run test:unit -- --reporter=verbose
npm run test:e2e -- --headed  # Visual e2e testing
```

## File Structure

```
scripts/
├── README.md           # This file
├── test-all.js         # Node.js runner (cross-platform)
├── test-all.sh         # Bash runner (Unix/Linux/macOS)
└── test-all.ps1        # PowerShell runner (Windows)
```

## Best Practices

1. **Run tests before committing**: Use `npm run test:all` 
2. **Use detailed runner for debugging**: `npm run test:all:verbose`
3. **Check coverage regularly**: `npm run test:all:with-coverage`
4. **CI/CD integration**: Use `npm run test:ci` in automated pipelines
5. **Platform-specific**: Use appropriate runner for your OS when debugging