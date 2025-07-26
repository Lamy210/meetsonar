#!/usr/bin/env node

// Socket.IO test to backend
import { io } from 'socket.io-client';

console.log('Testing Socket.IO connection to backend...');

const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  forceNew: true,
  reconnection: false
});

socket.on('connect', () => {
  console.log('✅ Socket.IO connection established');

  // Join room using Socket.IO event
  const roomData = {
    roomId: 'test123',
    displayName: 'NodeTestUser'
  };

  console.log('📤 Joining room:', roomData);
  socket.emit('join-room', roomData);

  // Wait for response and then close
  setTimeout(() => {
    console.log('⏰ Closing connection after 5 seconds');
    socket.close();
  }, 5000);
});

socket.on('participant-joined', (data) => {
  console.log('📨 Participant joined:', data);
});

socket.on('error', (error) => {
  console.error('❌ Socket.IO error:', error);
});

socket.on('disconnect', () => {
  console.log('🔌 Socket.IO disconnected');
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  socket.disconnect();
  process.exit(1);
}, 10000);
