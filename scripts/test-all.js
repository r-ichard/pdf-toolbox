#!/usr/bin/env node

/**
 * Comprehensive Test Runner for PDF Toolbox (Node.js)
 * Cross-platform test runner that works on Windows, macOS, and Linux
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const failedTests = [];

// Command line options
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const coverage = process.argv.includes('--coverage') || process.argv.includes('-c');

function printStatus(status, message) {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (status) {
        case 'INFO':
            console.log(`${colors.blue}ℹ [${timestamp}] ${message}${colors.reset}`);
            break;
        case 'SUCCESS':
            console.log(`${colors.green}✅ [${timestamp}] ${message}${colors.reset}`);
            testsPassed++;
            break;
        case 'ERROR':
            console.log(`${colors.red}❌ [${timestamp}] ${message}${colors.reset}`);
            testsFailed++;
            failedTests.push(message);
            break;
        case 'WARNING':
            console.log(`${colors.yellow}⚠️ [${timestamp}] ${message}${colors.reset}`);
            break;
    }
}

function runTest(testName, command, options = {}) {
    printStatus('INFO', `Running: ${testName}`);
    
    try {
        const execOptions = {
            stdio: options.showOutput ? 'inherit' : 'pipe',
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8'
        };
        
        execSync(command, execOptions);
        printStatus('SUCCESS', `${testName} passed`);
        return true;
    } catch (error) {
        printStatus('ERROR', `${testName} failed`);
        if (verbose && error.stdout) {
            console.log(error.stdout);
        }
        if (verbose && error.stderr) {
            console.error(error.stderr);
        }
        return false;
    }
}

function runTestSuite() {
    console.log(`${colors.cyan}🧪 PDF Toolbox - Comprehensive Test Suite${colors.reset}`);
    console.log(`${colors.cyan}========================================${colors.reset}`);
    console.log('');

    // Phase 1: Code Quality & Linting
    printStatus('INFO', 'Phase 1: Code Quality & Linting');
    console.log('----------------------------------------');
    
    if (runTest('ESLint Code Quality Check', 'npm run lint')) {
        console.log('');
    } else {
        printStatus('WARNING', 'Continuing with remaining tests...');
        console.log('');
    }

    // Phase 2: TypeScript Compilation
    printStatus('INFO', 'Phase 2: TypeScript Compilation');
    console.log('----------------------------------------');
    
    if (runTest('TypeScript Compilation', 'npx tsc --noEmit')) {
        console.log('');
    } else {
        printStatus('WARNING', 'TypeScript errors found, but continuing...');
        console.log('');
    }

    // Phase 3: Unit Tests
    printStatus('INFO', 'Phase 3: Unit Tests');
    console.log('----------------------------------------');
    
    const testCommand = coverage ? 'npm run test:coverage' : 'npm run test:unit';
    if (runTest('Unit Tests (Vitest)', testCommand, { showOutput: true })) {
        console.log('');
    } else {
        printStatus('ERROR', 'Unit tests failed - critical error');
        console.log('');
    }

    // Phase 4: Build Test
    printStatus('INFO', 'Phase 4: Build Verification');
    console.log('----------------------------------------');
    
    if (runTest('Production Build', 'npm run build')) {
        console.log('');
    } else {
        printStatus('ERROR', 'Build failed - critical error');
        console.log('');
    }

    // Phase 5: E2E Tests (only if build succeeded)
    if (testsFailed === 0 || !failedTests.some(test => test.includes('Production Build'))) {
        printStatus('INFO', 'Phase 5: End-to-End Tests');
        console.log('----------------------------------------');
        
        if (runTest('E2E Tests (Playwright)', 'npm run test:e2e', { showOutput: true })) {
            console.log('');
        } else {
            printStatus('ERROR', 'E2E tests failed');
            console.log('');
        }
    } else {
        printStatus('WARNING', 'Skipping E2E tests due to build failure');
        console.log('');
    }

    // Test Summary
    console.log(`${colors.cyan}📊 Test Summary${colors.reset}`);
    console.log(`${colors.cyan}===============${colors.reset}`);
    console.log(`Tests Passed: ${colors.green}${testsPassed}${colors.reset}`);
    console.log(`Tests Failed: ${colors.red}${testsFailed}${colors.reset}`);

    if (testsFailed === 0) {
        printStatus('SUCCESS', 'All tests passed! 🎉');
        console.log('');
        console.log(`${colors.green}Your PDF Toolbox is ready for deployment! 🚀${colors.reset}`);
        process.exit(0);
    } else {
        console.log('');
        printStatus('ERROR', 'Some tests failed:');
        failedTests.forEach(test => {
            console.log(`  ${colors.red}• ${test}${colors.reset}`);
        });
        console.log('');
        console.log(`${colors.red}Please fix the failing tests before deployment.${colors.reset}`);
        process.exit(1);
    }
}

// Help text
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
${colors.cyan}PDF Toolbox Test Runner${colors.reset}

Usage: node scripts/test-all.js [options]

Options:
  --verbose, -v     Show detailed output for failed tests
  --coverage, -c    Run tests with coverage report
  --help, -h        Show this help message

Examples:
  node scripts/test-all.js                 # Run all tests
  node scripts/test-all.js --verbose       # Run with verbose output
  node scripts/test-all.js --coverage      # Run with coverage report
`);
    process.exit(0);
}

// Run the test suite
runTestSuite();