#!/bin/bash

# Comprehensive stress testing runner
# This script will run all stress tests and generate reports

echo "🚀 Gift Card Backend Stress Testing Suite"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
    echo -e "${BLUE}🔍 Checking if backend is running...${NC}"
    if curl -s http://localhost:3002/ > /dev/null; then
        echo -e "${GREEN}✅ Backend is running on localhost:3002${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running on localhost:3002${NC}"
        echo "Please start your backend first with: npm run start:dev"
        return 1
    fi
}

# Install stress testing tools
install_tools() {
    echo -e "${BLUE}📦 Installing stress testing tools...${NC}"
    
    # Check if artillery is installed
    if ! command -v artillery &> /dev/null; then
        echo "Installing Artillery..."
        npm install -g artillery
    else
        echo "Artillery is already installed"
    fi
    
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        echo "Installing k6..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install k6
        else
            echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        fi
    else
        echo "k6 is already installed"
    fi
    
    # Check if ab (Apache Bench) is available
    if ! command -v ab &> /dev/null; then
        echo -e "${YELLOW}⚠️  Apache Bench (ab) not found. Some tests will be skipped.${NC}"
    else
        echo "Apache Bench is available"
    fi
}

# Run Artillery tests
run_artillery_tests() {
    echo -e "${BLUE}🎯 Running Artillery Load Tests...${NC}"
    echo "----------------------------------------"
    
    # Basic load test
    echo -e "${YELLOW}📊 Basic Load Test${NC}"
    artillery run artillery-config.yml --output artillery-basic-report.json
    
    # Spike test
    echo -e "${YELLOW}📊 Spike Test${NC}"
    artillery run artillery-spike-test.yml --output artillery-spike-report.json
    
    # Soak test
    echo -e "${YELLOW}📊 Soak Test (30 minutes)${NC}"
    echo "This will take 30 minutes. Press Ctrl+C to skip if needed."
    read -p "Continue with soak test? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        artillery run artillery-soak-test.yml --output artillery-soak-report.json
    else
        echo "Skipping soak test"
    fi
}

# Run k6 tests
run_k6_tests() {
    echo -e "${BLUE}🎯 Running k6 Load Tests...${NC}"
    echo "--------------------------------"
    
    if command -v k6 &> /dev/null; then
        echo -e "${YELLOW}📊 k6 Load Test${NC}"
        k6 run k6-load-test.js --out json=k6-report.json
    else
        echo -e "${RED}❌ k6 not installed. Skipping k6 tests.${NC}"
    fi
}

# Run Apache Bench tests
run_ab_tests() {
    echo -e "${BLUE}🎯 Running Apache Bench Tests...${NC}"
    echo "----------------------------------------"
    
    if command -v ab &> /dev/null; then
        ./ab-tests.sh > ab-results.txt 2>&1
        echo -e "${GREEN}✅ Apache Bench tests completed. Results saved to ab-results.txt${NC}"
    else
        echo -e "${RED}❌ Apache Bench not available. Skipping AB tests.${NC}"
    fi
}

# Generate summary report
generate_report() {
    echo -e "${BLUE}📋 Generating Test Summary...${NC}"
    echo "================================"
    
    # Create reports directory
    mkdir -p reports
    
    # Move all reports to reports directory
    mv *.json reports/ 2>/dev/null || true
    mv *.txt reports/ 2>/dev/null || true
    
    # Generate summary
    cat > reports/test-summary.md << EOF
# Stress Test Summary
Generated: $(date)

## Test Results Overview

### Artillery Tests
- Basic Load Test: artillery-basic-report.json
- Spike Test: artillery-spike-report.json  
- Soak Test: artillery-soak-report.json

### k6 Tests
- Load Test: k6-report.json

### Apache Bench Tests
- Results: ab-results.txt

## Key Metrics to Review
1. **Response Times**: Look for p95 and p99 percentiles
2. **Error Rates**: Should be < 5% for healthy system
3. **Throughput**: Requests per second
4. **Resource Usage**: CPU and memory during tests

## Recommendations
- If error rates > 5%, investigate bottlenecks
- If response times > 2s for p95, optimize slow endpoints
- If system becomes unresponsive, add rate limiting
- Monitor database connections and query performance
EOF

    echo -e "${GREEN}✅ Test summary generated in reports/test-summary.md${NC}"
    echo -e "${BLUE}📁 All reports saved in reports/ directory${NC}"
}

# Main execution
main() {
    # Check if backend is running
    if ! check_backend; then
        exit 1
    fi
    
    # Install tools
    install_tools
    
    echo -e "${YELLOW}🚀 Starting stress tests...${NC}"
    echo "This may take a while. You can monitor system resources in another terminal."
    echo ""
    
    # Run tests
    run_artillery_tests
    run_k6_tests  
    run_ab_tests
    
    # Generate report
    generate_report
    
    echo -e "${GREEN}🎉 All stress tests completed!${NC}"
    echo -e "${BLUE}📊 Check the reports/ directory for detailed results${NC}"
}

# Run main function
main "$@"
