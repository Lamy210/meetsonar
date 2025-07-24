#!/bin/bash

# MeetSonar Test Execution Script
# Usage: ./run-tests.sh

echo "🚀 MeetSonar Test Suite"
echo "======================"

# Check if Docker services are running
echo "📋 Checking Docker services..."
docker compose ps | grep -q "Up" 
if [ $? -eq 0 ]; then
    echo "✅ Docker services are running"
else
    echo "⚠️  Starting Docker services..."
    docker compose up -d
    sleep 5
fi

# Test 1: API Endpoints
echo ""
echo "🔧 Testing API Endpoints..."
bun test tests/integration/api.test.ts > /tmp/api-test.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API tests passed"
    API_RESULT="PASS"
else
    echo "❌ API tests failed"
    API_RESULT="FAIL"
fi

# Test 2: Basic functionality
echo ""
echo "🌐 Testing basic WebSocket connection..."
curl -I http://localhost:5000/api/rooms/test/participants > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend is accessible"
    BACKEND_RESULT="PASS"
else
    echo "❌ Backend is not accessible"
    BACKEND_RESULT="FAIL"
fi

# Test 3: Frontend accessibility
echo ""
echo "🎨 Testing frontend accessibility..."
curl -I http://localhost:5173 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend is accessible"
    FRONTEND_RESULT="PASS"
else
    echo "❌ Frontend is not accessible"
    FRONTEND_RESULT="FAIL"
fi

# Generate Test Report
echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "API Endpoints:        $API_RESULT"
echo "Backend Service:      $BACKEND_RESULT"  
echo "Frontend Service:     $FRONTEND_RESULT"
echo ""

# Chat functionality manual test instructions
echo "🧪 Manual Chat Test Instructions:"
echo "================================="
echo "1. Open two browser tabs:"
echo "   - Tab 1: http://localhost:5173/room/test?name=Alice"
echo "   - Tab 2: http://localhost:5173/room/test?name=Bob"
echo ""
echo "2. In both tabs, switch to 'Chat' tab"
echo "3. Send messages between Alice and Bob"
echo "4. Verify messages appear on both sides"
echo "5. Open a third tab with a different name to test chat history"
echo ""

if [ "$API_RESULT" = "PASS" ] && [ "$BACKEND_RESULT" = "PASS" ] && [ "$FRONTEND_RESULT" = "PASS" ]; then
    echo "🎉 All automated tests passed! Ready for manual testing."
    exit 0
else
    echo "⚠️  Some tests failed. Please check the logs."
    exit 1
fi
