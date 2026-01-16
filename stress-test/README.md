# Stress Testing Guide for Gift Card Backend

This directory contains comprehensive stress testing tools and configurations for your NestJS backend.

## 🚀 Quick Start

### 1. Prerequisites

- Backend running on `localhost:3002`
- Node.js and npm installed
- Optional: k6, Apache Bench (ab)

### 2. Install Tools

```bash
# Install stress testing tools globally
npm install -g artillery

# Install k6 (macOS)
brew install k6

# Install Apache Bench (usually pre-installed on macOS)
# For Ubuntu/Debian: sudo apt-get install apache2-utils
```

### 3. Run All Tests

```bash
# Make scripts executable
chmod +x *.sh

# Run comprehensive test suite
./run-tests.sh
```

## 🎯 Individual Test Options

### Artillery (Recommended for beginners)

```bash
# Basic load test
artillery run artillery-config.yml

# Quick test
artillery quick --count 100 --num 10 http://localhost:3002/

# Spike test
artillery run artillery-spike-test.yml

# Soak test (30 minutes)
artillery run artillery-soak-test.yml
```

### k6 (Advanced)

```bash
# Run k6 load test
k6 run k6-load-test.js

# Run with custom options
k6 run --vus 50 --duration 5m k6-load-test.js
```

### Apache Bench (Simple)

```bash
# Run Apache Bench tests
./ab-tests.sh

# Manual AB test
ab -n 1000 -c 10 http://localhost:3002/
```

## 📊 Test Types Explained

### 1. **Load Testing**

- **Purpose**: Test normal expected load
- **Duration**: 5-10 minutes
- **Load**: 50-100 concurrent users
- **Goal**: Ensure system handles expected traffic

### 2. **Spike Testing**

- **Purpose**: Test sudden traffic spikes
- **Pattern**: Normal → Sudden spike → Recovery
- **Goal**: Ensure system can handle traffic bursts

### 3. **Soak Testing**

- **Purpose**: Test system stability over time
- **Duration**: 30+ minutes
- **Goal**: Find memory leaks, performance degradation

### 4. **Stress Testing**

- **Purpose**: Find breaking point
- **Load**: Gradually increase until failure
- **Goal**: Identify maximum capacity

## 🔍 Monitoring During Tests

### System Monitoring

```bash
# Monitor system resources
./monitor.sh

# Or use built-in tools
top -l 1 | grep "CPU usage"
vm_stat
netstat -an | grep :3002
```

### Application Monitoring

- Check your backend logs
- Monitor database connections
- Watch for memory usage
- Track response times

## 📈 Key Metrics to Watch

### Performance Metrics

- **Response Time**: p95 < 2s, p99 < 5s
- **Throughput**: Requests per second
- **Error Rate**: < 5% for healthy system
- **Availability**: > 99% uptime

### System Metrics

- **CPU Usage**: < 80% under load
- **Memory Usage**: Stable, no leaks
- **Database Connections**: Within limits
- **Network I/O**: No bottlenecks

## 🛠️ Customizing Tests

### Modify Load Patterns

Edit `artillery-config.yml`:

```yaml
phases:
  - duration: 60 # Duration in seconds
    arrivalRate: 10 # Users per second
    rampTo: 50 # Ramp up to this rate
```

### Add Custom Scenarios

Edit the `scenarios` section in Artillery configs or add new functions in k6 script.

### Adjust Thresholds

In k6, modify the `thresholds` section:

```javascript
thresholds: {
  http_req_duration: ['p(95)<2000'], // 95% under 2s
  http_req_failed: ['rate<0.1'],     // Error rate < 10%
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"Connection refused"**
   - Ensure backend is running on localhost:3002
   - Check if port is available

2. **High error rates**
   - Check backend logs for errors
   - Verify database connections
   - Check rate limiting settings

3. **Slow response times**
   - Monitor database query performance
   - Check for N+1 query problems
   - Verify caching is working

4. **Memory issues**
   - Check for memory leaks
   - Monitor garbage collection
   - Verify connection pooling

### Performance Optimization Tips

1. **Database**
   - Add indexes for frequently queried fields
   - Use connection pooling
   - Optimize slow queries

2. **Caching**
   - Implement Redis for session storage
   - Cache frequently accessed data
   - Use CDN for static assets

3. **Code Optimization**
   - Profile slow endpoints
   - Optimize database queries
   - Implement proper error handling

## 📋 Test Scenarios Covered

### Public Endpoints

- Health checks
- Country/category listings
- Product browsing
- Currency information

### Authentication

- User registration
- User login
- Token validation

### Cart Operations

- Add to cart
- Update cart
- Remove from cart
- Get cart contents

### Order Processing

- Create orders
- Order validation
- Payment processing

## 🎯 Next Steps

1. **Run baseline tests** to establish performance baseline
2. **Identify bottlenecks** from test results
3. **Optimize slow endpoints** based on findings
4. **Implement monitoring** in production
5. **Set up alerts** for performance degradation
6. **Regular testing** as part of CI/CD pipeline

## 📚 Additional Resources

- [Artillery Documentation](https://artillery.io/docs/)
- [k6 Documentation](https://k6.io/docs/)
- [Apache Bench Guide](https://httpd.apache.org/docs/2.4/programs/ab.html)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)

---

**Happy Testing! 🚀**
