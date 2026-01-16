#!/bin/bash

# Start OpenTelemetry Observability Stack
echo "🚀 Starting OpenTelemetry Observability Stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start the telemetry stack
docker-compose -f docker-compose.telemetry.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.telemetry.yml ps

echo ""
echo "🎉 Telemetry stack is running!"
echo ""
echo "📱 Access URLs:"
echo "   • Jaeger UI (Traces): http://localhost:16686"
echo "   • Prometheus (Metrics): http://localhost:9090"
echo "   • Grafana (Dashboards): http://localhost:3001 (admin/admin)"
echo "   • OTLP Collector: http://localhost:4318"
echo ""
echo "🔧 To stop the stack:"
echo "   docker-compose -f docker-compose.telemetry.yml down"
echo ""
echo "📝 To view logs:"
echo "   docker-compose -f docker-compose.telemetry.yml logs -f" 