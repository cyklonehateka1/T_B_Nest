#!/bin/bash

# Simple Apache Bench stress tests
# Make sure your backend is running on localhost:3002

BASE_URL="http://localhost:3002"

echo "🚀 Starting Apache Bench Stress Tests"
echo "====================================="

# Test 1: Basic health check
echo "📊 Test 1: Health Check (1000 requests, 10 concurrent)"
ab -n 1000 -c 10 -H "Accept: application/json" "${BASE_URL}/"

echo -e "\n📊 Test 2: Public Resources (500 requests, 5 concurrent)"
ab -n 500 -c 5 -H "Accept: application/json" "${BASE_URL}/resources/countries"

echo -e "\n📊 Test 3: Products Endpoint (300 requests, 5 concurrent)"
ab -n 300 -c 5 -H "Accept: application/json" "${BASE_URL}/products"

echo -e "\n📊 Test 4: High Load Test (2000 requests, 50 concurrent)"
ab -n 2000 -c 50 -H "Accept: application/json" "${BASE_URL}/"

echo -e "\n📊 Test 5: Spike Test (1000 requests, 100 concurrent)"
ab -n 1000 -c 100 -H "Accept: application/json" "${BASE_URL}/"

echo -e "\n✅ All Apache Bench tests completed!"
echo "Check the results above for performance metrics."
