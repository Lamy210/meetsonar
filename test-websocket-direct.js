#!/usr/bin/env node

// Direct WebSocket test to backend
import WebSocket from 'ws';

console.log('Testing direct WebSocket connection to backend...');

const ws = new WebSocket('ws://localhost:5000/ws', {
  headers: {
    'Origin': 'http://localhost:5173',
    'User-Agent': 'Node.js WebSocket Test'
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connection opened');
  
  // Send join-room message
  const message = {
    type: 'join-room',
    roomId: 'test123',
    participantId: 'test-participant-123',
    payload: {
      displayName: 'NodeTestUser'
    }
  };
  
  console.log('📤 Sending message:', JSON.stringify(message));
  ws.send(JSON.stringify(message));
  
  // Wait for response and then close
  setTimeout(() => {
    console.log('⏰ Closing connection after 5 seconds');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  process.exit(1);
}, 10000);
