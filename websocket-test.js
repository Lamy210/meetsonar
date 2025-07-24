// WebSocket接続テストスクリプト
const WebSocket = require('ws');

const testWebSocket = () => {
  console.log('Testing WebSocket connection...');
  
  // 1. 直接バックエンドに接続
  console.log('\n1. Testing direct backend connection (ws://localhost:5000/ws)');
  const ws1 = new WebSocket('ws://localhost:5000/ws');
  
  ws1.on('open', () => {
    console.log('✅ Direct backend connection: SUCCESS');
    ws1.close();
  });
  
  ws1.on('error', (error) => {
    console.log('❌ Direct backend connection: FAILED');
    console.log('Error:', error.message);
  });
  
  ws1.on('close', (code, reason) => {
    console.log(`Direct backend connection closed: ${code} ${reason}`);
  });
  
  // 2. Viteプロキシ経由で接続
  setTimeout(() => {
    console.log('\n2. Testing Vite proxy connection (ws://localhost:5173/ws)');
    const ws2 = new WebSocket('ws://localhost:5173/ws');
    
    ws2.on('open', () => {
      console.log('✅ Vite proxy connection: SUCCESS');
      ws2.close();
    });
    
    ws2.on('error', (error) => {
      console.log('❌ Vite proxy connection: FAILED');
      console.log('Error:', error.message);
    });
    
    ws2.on('close', (code, reason) => {
      console.log(`Vite proxy connection closed: ${code} ${reason}`);
    });
  }, 1000);
};

testWebSocket();
