// DEPRECATED: このファイルは古いWebSocket実装用のテストです
// 現在のSocket.IO実装のテストには test-websocket-direct.js を使用してください

console.log('⚠️  このテストファイルは廃止されました。');
console.log('📡 Socket.IOテストには以下を使用してください:');
console.log('   bun test-websocket-direct.js');
console.log('');
console.log('🔧 現在の実装:');
console.log('   - Socket.IO Server: http://localhost:5000/socket.io/');
console.log('   - HTTP API: http://localhost:5000/api/');
console.log('   - Health Check: http://localhost:5000/health');
console.log('');
console.log('📋 利用可能なテストコマンド:');
console.log('   bun test-websocket-direct.js  # Socket.IO接続テスト');
console.log('   bun test-server.js           # サーバー全体テスト');
console.log('   bun test-multi-user.js       # マルチユーザーテスト');

process.exit(0);
