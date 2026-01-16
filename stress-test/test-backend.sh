#!/bin/bash

# Test if backend is running and accessible
echo "🔍 Testing Backend Connectivity"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test backend health
test_backend() {
    echo -e "${BLUE}Testing backend at http://localhost:3002/${NC}"
    
    # Test with curl
    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ Backend is running and responding (HTTP $response)${NC}"
        
        # Test a few more endpoints
        echo -e "${BLUE}Testing additional endpoints...${NC}"
        
        # Test resources endpoint
        resources_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/resources/countries 2>/dev/null)
        if [ "$resources_response" = "200" ]; then
            echo -e "${GREEN}✅ Resources endpoint working${NC}"
        else
            echo -e "${YELLOW}⚠️  Resources endpoint returned HTTP $resources_response${NC}"
        fi
        
        # Test products endpoint
        products_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/products 2>/dev/null)
        if [ "$products_response" = "200" ]; then
            echo -e "${GREEN}✅ Products endpoint working${NC}"
        else
            echo -e "${YELLOW}⚠️  Products endpoint returned HTTP $products_response${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}❌ Backend is not responding (HTTP $response)${NC}"
        return 1
    fi
}

# Check if backend process is running
check_process() {
    echo -e "${BLUE}Checking for Node.js processes...${NC}"
    
    # Look for node processes that might be the backend
    node_processes=$(ps aux | grep node | grep -v grep | wc -l)
    
    if [ "$node_processes" -gt 0 ]; then
        echo -e "${GREEN}✅ Found $node_processes Node.js process(es) running${NC}"
        ps aux | grep node | grep -v grep | head -3
    else
        echo -e "${YELLOW}⚠️  No Node.js processes found${NC}"
    fi
}

# Main test function
main() {
    echo "Starting backend connectivity test..."
    echo ""
    
    # Check processes first
    check_process
    echo ""
    
    # Test backend connectivity
    if test_backend; then
        echo ""
        echo -e "${GREEN}🎉 Backend is ready for stress testing!${NC}"
        echo ""
        echo "You can now run:"
        echo "  npm run test:quick    # Quick test"
        echo "  npm run test:basic    # Basic load test"
        echo "  ./run-tests.sh        # Full test suite"
    else
        echo ""
        echo -e "${RED}❌ Backend is not accessible${NC}"
        echo ""
        echo "To start your backend:"
        echo "  cd ../tipster_betting_backend"
        echo "  npm run start:dev"
        echo ""
        echo "Then run this test again:"
        echo "  ./test-backend.sh"
    fi
}

# Run main function
main "$@"
