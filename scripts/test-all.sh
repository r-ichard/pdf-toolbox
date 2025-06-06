#!/bin/bash

# Comprehensive Test Runner for PDF Toolbox
# This script runs all tests: linting, unit tests, build verification, and e2e tests

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "INFO")
            echo -e "${BLUE}ℹ ${message}${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ ${message}${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            ;;
        "ERROR")
            echo -e "${RED}❌ ${message}${NC}"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            FAILED_TESTS+=("$message")
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
    esac
}

# Function to run a test step
run_test() {
    local test_name=$1
    local test_command=$2
    
    print_status "INFO" "Running: $test_name"
    
    if eval $test_command > /dev/null 2>&1; then
        print_status "SUCCESS" "$test_name passed"
        return 0
    else
        print_status "ERROR" "$test_name failed"
        return 1
    fi
}

# Function to run a test step with output
run_test_with_output() {
    local test_name=$1
    local test_command=$2
    
    print_status "INFO" "Running: $test_name"
    
    if eval $test_command; then
        print_status "SUCCESS" "$test_name passed"
        return 0
    else
        print_status "ERROR" "$test_name failed"
        return 1
    fi
}

echo "🧪 PDF Toolbox - Comprehensive Test Suite"
echo "========================================"
echo ""

# 1. Code Quality & Linting
print_status "INFO" "Phase 1: Code Quality & Linting"
echo "----------------------------------------"

if run_test "ESLint Code Quality Check" "npm run lint"; then
    echo ""
else
    print_status "WARNING" "Continuing with remaining tests..."
    echo ""
fi

# 2. TypeScript Compilation
print_status "INFO" "Phase 2: TypeScript Compilation"
echo "----------------------------------------"

if run_test "TypeScript Compilation" "npx tsc --noEmit"; then
    echo ""
else
    print_status "WARNING" "TypeScript errors found, but continuing..."
    echo ""
fi

# 3. Unit Tests
print_status "INFO" "Phase 3: Unit Tests"
echo "----------------------------------------"

if run_test_with_output "Unit Tests (Vitest)" "npm run test:unit"; then
    echo ""
else
    print_status "ERROR" "Unit tests failed - critical error"
    echo ""
fi

# 4. Build Test
print_status "INFO" "Phase 4: Build Verification"
echo "----------------------------------------"

if run_test "Production Build" "npm run build"; then
    echo ""
else
    print_status "ERROR" "Build failed - critical error"
    echo ""
fi

# 5. E2E Tests (only if build succeeded)
if [ $TESTS_FAILED -eq 0 ] || [[ ! " ${FAILED_TESTS[@]} " =~ " Production Build failed " ]]; then
    print_status "INFO" "Phase 5: End-to-End Tests"
    echo "----------------------------------------"
    
    if run_test_with_output "E2E Tests (Playwright)" "npm run test:e2e"; then
        echo ""
    else
        print_status "ERROR" "E2E tests failed"
        echo ""
    fi
else
    print_status "WARNING" "Skipping E2E tests due to build failure"
    echo ""
fi

# Test Summary
echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    print_status "SUCCESS" "All tests passed! 🎉"
    echo ""
    echo "Your PDF Toolbox is ready for deployment! 🚀"
    exit 0
else
    echo ""
    print_status "ERROR" "Some tests failed:"
    for failed_test in "${FAILED_TESTS[@]}"; do
        echo -e "  ${RED}• $failed_test${NC}"
    done
    echo ""
    echo "Please fix the failing tests before deployment."
    exit 1
fi