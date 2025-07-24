#!/usr/bin/env node

// Multi-user WebSocket test
import WebSocket from 'ws';

const users = [
  { id: 'user1', name: 'Alice' },
  { id: 'user2', name: 'Bob' },
  { id: 'user3', name: 'Charlie' }
];

async function testUser(user, delay = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log(`[${user.name}] Starting connection...`);
      
      const ws = new WebSocket('ws://localhost:5000/ws', {
        headers: {
          'Origin': 'http://localhost:5173',
          'User-Agent': `Test-${user.name}`
        }
      });

      ws.on('open', () => {
        console.log(`[${user.name}] ✅ Connected`);
        
        // Send join message
        const joinMessage = {
          type: 'join-room',
          roomId: 'test123',
          participantId: `${user.id}-${Date.now()}`,
          payload: {
            displayName: user.name
          }
        };
        
        console.log(`[${user.name}] 📤 Sending join message`);
        ws.send(JSON.stringify(joinMessage));

        // Send a chat message after 2 seconds
        setTimeout(() => {
          const chatMessage = {
            type: 'chat-message',
            roomId: 'test123',
            participantId: `${user.id}-${Date.now()}`,
            payload: {
              message: `Hello from ${user.name}!`,
              displayName: user.name
            }
          };
          
          console.log(`[${user.name}] 💬 Sending chat message`);
          ws.send(JSON.stringify(chatMessage));
        }, 2000);

        // Close after 10 seconds
        setTimeout(() => {
          console.log(`[${user.name}] 🔌 Closing connection`);
          ws.close();
          resolve(user);
        }, 10000);
      });

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`[${user.name}] 📨 Received: ${message.type}`);
      });

      ws.on('error', (error) => {
        console.error(`[${user.name}] ❌ Error:`, error.message);
        reject(error);
      });

      ws.on('close', (code, reason) => {
        console.log(`[${user.name}] 🔌 Disconnected: ${code} - ${reason}`);
      });
    }, delay);
  });
}

async function runMultiUserTest() {
  console.log('🚀 Starting multi-user WebSocket test...');
  
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
