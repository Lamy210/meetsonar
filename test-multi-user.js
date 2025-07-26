#!/usr/bin/env node

// Multi-user Socket.IO test
import { io } from 'socket.io-client';

const users = [
  { id: 'user1', name: 'Alice' },
  { id: 'user2', name: 'Bob' },
  { id: 'user3', name: 'Charlie' }
];

async function testUser(user, delay = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`[${user.name}] Starting connection...`);

      const socket = io('http://localhost:5000', {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false
      });

      socket.on('connect', () => {
        console.log(`[${user.name}] ✅ Connected`);

        // Join room using Socket.IO event
        const roomData = {
          roomId: 'test123',
          displayName: user.name
        };

        console.log(`[${user.name}] 📤 Joining room`);
        socket.emit('join-room', roomData);

        // Send a chat message after 2 seconds
        setTimeout(() => {
          const chatData = {
            message: `Hello from ${user.name}!`,
            roomId: 'test123'
          };

          console.log(`[${user.name}] 💬 Sending chat message`);
          socket.emit('chat-message', chatData);
        }, 2000);

        // Close after 10 seconds
        setTimeout(() => {
          console.log(`[${user.name}] 🔌 Closing connection`);
          socket.disconnect();
          resolve(user);
        }, 10000);
      });

      socket.on('participant-joined', (data) => {
        console.log(`[${user.name}] 📨 Participant joined:`, data);
      });

      socket.on('chat-message', (data) => {
        console.log(`[${user.name}] 📨 Chat message:`, data);
      });

      socket.on('error', (error) => {
        console.error(`[${user.name}] ❌ Error:`, error);
        reject(error);
      });

      socket.on('disconnect', () => {
        console.log(`[${user.name}] 🔌 Disconnected`);
      });
    }, delay);
  });
}

async function runMultiUserTest() {
  console.log('🚀 Starting multi-user Socket.IO test...');

  try {
    // Start all users with different delays
    const promises = users.map((user, index) =>
      testUser(user, index * 1000) // 1 second delay between each user
    );

    await Promise.all(promises);
    console.log('✅ All users completed the test');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  process.exit(0);
}

runMultiUserTest();
