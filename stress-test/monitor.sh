#!/bin/bash

# Monitoring script for stress testing
# Run this in a separate terminal while running stress tests

echo "🔍 Starting Backend Monitoring"
echo "============================="
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to get system metrics
get_metrics() {
    echo "📊 System Metrics - $(date)"
    echo "------------------------"
    
    # CPU usage
    echo "CPU Usage:"
    top -l 1 | grep "CPU usage" || echo "CPU info not available"
    
    # Memory usage
    echo -e "\nMemory Usage:"
    vm_stat | head -10
    
    # Network connections
    echo -e "\nActive Network Connections:"
    netstat -an | grep :3002 | wc -l | xargs echo "Port 3002 connections:"
    
    # Process info
    echo -e "\nNode.js Process Info:"
    ps aux | grep node | grep -v grep | head -3
    
    echo -e "\n" + "="*50 + "\n"
}

# Monitor every 5 seconds
while true; do
    get_metrics
    sleep 5
done
