#!/bin/bash

# Setup script for stress testing
echo "🚀 Setting up Tipster Betting Backend Stress Testing"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if backend is running
check_backend() {
    echo -e "${BLUE}🔍 Checking if backend is running...${NC}"
    if curl -s http://localhost:3002/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running on localhost:3002${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend is not running on localhost:3002${NC}"
        return 1
    fi
}

# Install dependencies
install_deps() {
    echo -e "${BLUE}📦 Installing stress testing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Test Artillery installation
test_artillery() {
    echo -e "${BLUE}🧪 Testing Artillery installation...${NC}"
    if npx artillery --version > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Artillery is working${NC}"
        return 0
    else
        echo -e "${RED}❌ Artillery test failed${NC}"
        return 1
    fi
}

# Run a simple test
run_simple_test() {
    echo -e "${BLUE}🧪 Running simple connectivity test...${NC}"
    npx artillery quick --count 5 --num 1 http://localhost:3002/ > test-results.txt 2>&1
    
    if grep -q "ECONNREFUSED" test-results.txt; then
        echo -e "${RED}❌ Backend is not accessible${NC}"
        echo "Please start your backend with: npm run start:dev"
        return 1
    else
        echo -e "${GREEN}✅ Backend is accessible and responding${NC}"
        return 0
    fi
}

# Main setup function
main() {
    echo "Starting setup process..."
    
    # Install dependencies
    install_deps
    
    # Test Artillery
    if ! test_artillery; then
        echo -e "${RED}❌ Artillery setup failed${NC}"
        exit 1
    fi
    
    # Check backend
    if ! check_backend; then
        echo -e "${YELLOW}⚠️  Backend not running. Please start it manually:${NC}"
        echo "   cd ../tipster_betting_backend"
        echo "   npm run start:dev"
        echo ""
        echo "Then run this script again to test connectivity."
        exit 1
    fi
    
    # Run simple test
    if run_simple_test; then
        echo -e "${GREEN}🎉 Setup complete! You can now run stress tests.${NC}"
        echo ""
        echo "Available commands:"
        echo "  npm run test:quick    - Quick test (10 requests)"
        echo "  npm run test:basic    - Basic load test"
        echo "  npm run test:spike    - Spike test"
        echo "  npm run test:ab       - Apache Bench tests"
        echo "  npm run test:monitor  - System monitoring"
        echo ""
        echo "To run all tests: ./run-tests.sh"
    else
        echo -e "${RED}❌ Setup incomplete. Please check backend status.${NC}"
    fi
}

# Run main function
main "$@"
