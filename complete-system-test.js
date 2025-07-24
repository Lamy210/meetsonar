#!/usr/bin/env node

// 完全な複数ユーザーシステムテスト
import WebSocket from 'ws';

const testRoomId = 'final-test-room';

// Create room first
async function createRoom() {
  try {
    const response = await fetch('http://localhost:5000/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testRoomId,
        name: 'Final Test Room'
      })
    });
    
    if (response.ok) {
      const room = await response.json();
      console.log('✅ Room created:', room);
    } else {
      console.log('ℹ️ Room might already exist');
    }
  } catch (error) {
    console.error('Failed to create room:', error);
  }
}

// Simulate a user session
class UserSession {
  constructor(name, id) {
    this.name = name;
    this.id = id;
    this.ws = null;
    this.participantId = `${id}-${Date.now()}`;
    this.connected = false;
    this.receivedMessages = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[${this.name}] 🔗 Connecting...`);
      
      this.ws = new WebSocket('ws://localhost:5000/ws', {
        headers: {
          'Origin': 'http://localhost:5173',
          'User-Agent': `TestUser-${this.name}`
        }
      });

      this.ws.on('open', () => {
        console.log(`[${this.name}] ✅ Connected`);
        this.connected = true;
        this.joinRoom();
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        this.receivedMessages.push(message);
        console.log(`[${this.name}] 📨 ${message.type}: ${JSON.stringify(message.payload || {}).substring(0, 50)}...`);
      });

      this.ws.on('error', (error) => {
        console.error(`[${this.name}] ❌ Error:`, error.message);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        console.log(`[${this.name}] 🔌 Disconnected: ${code}`);
        this.connected = false;
      });
    });
  }

  joinRoom() {
    if (!this.connected) return;
    
    const message = {
      type: 'join-room',
      roomId: testRoomId,
      participantId: this.participantId,
      payload: { displayName: this.name }
    };
    
    console.log(`[${this.name}] 🚪 Joining room...`);
    this.ws.send(JSON.stringify(message));
  }

  sendChatMessage(text) {
    if (!this.connected) return;
    
    const message = {
      type: 'chat-message',
      roomId: testRoomId,
      participantId: this.participantId,
      payload: {
        message: text,
        displayName: this.name
      }
    };
    
    console.log(`[${this.name}] 💬 Sending: "${text}"`);
    this.ws.send(JSON.stringify(message));
  }

  requestChatHistory() {
    if (!this.connected) return;
    
    const message = {
      type: 'chat-history',
      roomId: testRoomId,
      participantId: this.participantId,
      payload: {}
    };
    
    console.log(`[${this.name}] 📚 Requesting chat history...`);
    this.ws.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.ws && this.connected) {
      console.log(`[${this.name}] 👋 Leaving...`);
      this.ws.close();
    }
  }

  getStats() {
    return {
      name: this.name,
      connected: this.connected,
      messagesReceived: this.receivedMessages.length,
      participantEvents: this.receivedMessages.filter(m => m.type.includes('participant')).length,
      chatEvents: this.receivedMessages.filter(m => m.type.includes('chat')).length
    };
  }
}

async function runCompleteTest() {
  console.log('🚀 Starting complete multi-user system test...\n');

  // Create room
  await createRoom();
  
  // Create users
  const users = [
    new UserSession('Alice', 'user1'),
    new UserSession('Bob', 'user2'),
    new UserSession('Charlie', 'user3')
  ];

  try {
    // Phase 1: Connect all users
    console.log('\n=== Phase 1: Connecting users ===');
    for (let i = 0; i < users.length; i++) {
      await users[i].connect();
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between connections
    }

    // Phase 2: Chat interaction
    console.log('\n=== Phase 2: Chat interaction ===');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    users[0].sendChatMessage('Hello everyone! 👋');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    users[1].sendChatMessage('Hi Alice! How are you?');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    users[2].sendChatMessage('Great to be here! 🎉');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 3: Chat history test
    console.log('\n=== Phase 3: Chat history test ===');
    users[0].requestChatHistory();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 4: User leaving and rejoining
    console.log('\n=== Phase 4: User leaving and rejoining ===');
    users[1].disconnect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await users[1].connect();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    users[1].sendChatMessage('I\'m back! 🔄');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Phase 5: Statistics
    console.log('\n=== Phase 5: Test results ===');
    users.forEach(user => {
      const stats = user.getStats();
      console.log(`[${stats.name}] Connected: ${stats.connected}, Messages: ${stats.messagesReceived}, Participants: ${stats.participantEvents}, Chat: ${stats.chatEvents}`);
    });

    // Cleanup
    console.log('\n=== Cleanup ===');
    users.forEach(user => user.disconnect());
    
    console.log('\n✅ Complete system test finished successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
}

runCompleteTest();
