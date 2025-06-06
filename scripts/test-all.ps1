# Comprehensive Test Runner for PDF Toolbox (PowerShell)
# This script runs all tests: linting, unit tests, build verification, and e2e tests

param(
    [switch]$Verbose = $false
)

# Test results tracking
$TestsPassed = 0
$TestsFailed = 0
$FailedTests = @()

# Function to print colored output
function Write-Status {
    param(
        [string]$Status,
        [string]$Message
    )
    
    switch ($Status) {
        "INFO" {
            Write-Host "ℹ $Message" -ForegroundColor Blue
        }
        "SUCCESS" {
            Write-Host "✅ $Message" -ForegroundColor Green
            $script:TestsPassed++
        }
        "ERROR" {
            Write-Host "❌ $Message" -ForegroundColor Red
            $script:TestsFailed++
            $script:FailedTests += $Message
        }
        "WARNING" {
            Write-Host "⚠️ $Message" -ForegroundColor Yellow
        }
    }
}

# Function to run a test step
function Invoke-Test {
    param(
        [string]$TestName,
        [string]$TestCommand
    )
    
    Write-Status "INFO" "Running: $TestName"
    
    try {
        if ($Verbose) {
            Invoke-Expression $TestCommand
        } else {
            Invoke-Expression $TestCommand | Out-Null
        }
        Write-Status "SUCCESS" "$TestName passed"
        return $true
    }
    catch {
        Write-Status "ERROR" "$TestName failed"
        if ($Verbose) {
            Write-Host $_.Exception.Message -ForegroundColor Red
        }
        return $false
    }
}

# Function to run a test step with output
function Invoke-TestWithOutput {
    param(
        [string]$TestName,
        [string]$TestCommand
    )
    
    Write-Status "INFO" "Running: $TestName"
    
    try {
        Invoke-Expression $TestCommand
        Write-Status "SUCCESS" "$TestName passed"
        return $true
    }
    catch {
        Write-Status "ERROR" "$TestName failed"
        return $false
    }
}

Write-Host "🧪 PDF Toolbox - Comprehensive Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Code Quality & Linting
Write-Status "INFO" "Phase 1: Code Quality & Linting"
Write-Host "----------------------------------------"

if (Invoke-Test "ESLint Code Quality Check" "npm run lint") {
    Write-Host ""
} else {
    Write-Status "WARNING" "Continuing with remaining tests..."
    Write-Host ""
}

# 2. TypeScript Compilation
Write-Status "INFO" "Phase 2: TypeScript Compilation"
Write-Host "----------------------------------------"

if (Invoke-Test "TypeScript Compilation" "npx tsc --noEmit") {
    Write-Host ""
} else {
    Write-Status "WARNING" "TypeScript errors found, but continuing..."
    Write-Host ""
}

# 3. Unit Tests
Write-Status "INFO" "Phase 3: Unit Tests"
Write-Host "----------------------------------------"

if (Invoke-TestWithOutput "Unit Tests (Vitest)" "npm run test:unit") {
    Write-Host ""
} else {
    Write-Status "ERROR" "Unit tests failed - critical error"
    Write-Host ""
}

# 4. Build Test
Write-Status "INFO" "Phase 4: Build Verification"
Write-Host "----------------------------------------"

if (Invoke-Test "Production Build" "npm run build") {
    Write-Host ""
} else {
    Write-Status "ERROR" "Build failed - critical error"
    Write-Host ""
}

# 5. E2E Tests (only if build succeeded)
if ($TestsFailed -eq 0 -or $FailedTests -notcontains "Production Build failed") {
    Write-Status "INFO" "Phase 5: End-to-End Tests"
    Write-Host "----------------------------------------"
    
    if (Invoke-TestWithOutput "E2E Tests (Playwright)" "npm run test:e2e") {
        Write-Host ""
    } else {
        Write-Status "ERROR" "E2E tests failed"
        Write-Host ""
    }
} else {
    Write-Status "WARNING" "Skipping E2E tests due to build failure"
    Write-Host ""
}

# Test Summary
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "Tests Passed: " -NoNewline
Write-Host $TestsPassed -ForegroundColor Green
Write-Host "Tests Failed: " -NoNewline
Write-Host $TestsFailed -ForegroundColor Red

if ($TestsFailed -eq 0) {
    Write-Status "SUCCESS" "All tests passed! 🎉"
    Write-Host ""
    Write-Host "Your PDF Toolbox is ready for deployment! 🚀" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Status "ERROR" "Some tests failed:"
    foreach ($failedTest in $FailedTests) {
        Write-Host "  • $failedTest" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "Please fix the failing tests before deployment." -ForegroundColor Red
    exit 1
}