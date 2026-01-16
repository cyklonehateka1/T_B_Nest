# 🚀 Quick Start Guide - Stress Testing

## Step 1: Start Your Backend

```bash
# In one terminal, start your backend
cd ../tipster_betting_backend
npm run start:dev
```

## Step 2: Run Setup Script

```bash
# In another terminal, run the setup
cd stress-test
./setup.sh
```

## Step 3: Run Your First Test

```bash
# Quick test (10 requests)
npm run test:quick

# Basic load test
npm run test:basic
```

## 🎯 Available Tests

### Quick Tests (1-2 minutes)

```bash
npm run test:quick    # 10 requests, 2 concurrent
npm run test:ab        # Apache Bench tests
```

### Load Tests (5-10 minutes)

```bash
npm run test:basic     # Normal load test
npm run test:spike     # Spike test
```

### Extended Tests (30+ minutes)

```bash
npm run test:soak      # Soak test (30 minutes)
```

### Monitoring

```bash
npm run test:monitor   # System monitoring
```

## 🔧 Troubleshooting

### Backend Not Running

```bash
# Check if backend is running
curl http://localhost:3002/

# Start backend if not running
cd ../tipster_betting_backend
npm run start:dev
```

### Permission Issues

```bash
# Make scripts executable
chmod +x *.sh
```

### Artillery Not Found

```bash
# Install locally (already done)
npm install
```

## 📊 Understanding Results

### Good Performance

- ✅ Response time < 2 seconds
- ✅ Error rate < 5%
- ✅ No connection errors

### Issues to Watch

- ❌ High error rates (> 10%)
- ❌ Slow response times (> 5 seconds)
- ❌ Connection refused errors
- ❌ Memory leaks (increasing memory usage)

## 🎯 Next Steps

1. **Start with quick tests** to verify setup
2. **Run basic load test** to establish baseline
3. **Try spike test** to see how system handles traffic bursts
4. **Monitor system resources** during tests
5. **Analyze results** and optimize slow endpoints

## 📈 Example Commands

```bash
# Complete test suite
./run-tests.sh

# Just quick tests
npm run test:quick && npm run test:ab

# Monitor while testing
npm run test:monitor &
npm run test:basic
```

---

**Ready to stress test! 🚀**
