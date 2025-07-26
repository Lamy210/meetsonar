import { useState, useCallback } from 'react';

interface DiagnosticResult {
  type: 'direct' | 'proxy';
  status: 'success' | 'error';
  error?: any;
  latency?: number;
}

export const useWebSocketDiagnostics = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const waitForConnection = (socket: WebSocket, timeout = 5000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      socket.onopen = () => {
        clearTimeout(timer);
        resolve();
      };

      socket.onerror = (error) => {
        clearTimeout(timer);
        reject(error);
      };

      socket.onclose = (event) => {
        clearTimeout(timer);
        if (event.code !== 1000) {
          reject(new Error(`Connection closed with code ${event.code}: ${event.reason}`));
        }
      };
    });
  };

  const diagnose = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // 1. Socket.IO接続テスト
    console.log('🔍 Testing Socket.IO connection...');
    try {
      const startTime = Date.now();
      // Socket.IOを使用
      const { io } = await import('socket.io-client');
      const socket = io('http://localhost:5000', {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false
      });
      
      await new Promise((resolve, reject) => {
        socket.on('connect', () => resolve(void 0));
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });
      
      const endTime = Date.now();
      socket.disconnect();
      const latency = Date.now() - startTime;

      diagnosticResults.push({
        type: 'direct',
        status: 'success',
        latency
      });

      // Socket.IOテストイベント送信
      socket.emit('join-room', {
        roomId: 'diagnostic-room',
        displayName: 'Diagnostic User'
      });

      setTimeout(() => socket.disconnect(), 1000);
      console.log('✅ Socket.IO connection successful');
    } catch (error) {
      diagnosticResults.push({
        type: 'direct',
        status: 'error',
        error
      });
      console.error('❌ Socket.IO connection failed:', error);
    }

    // 2. Viteプロキシ経由テスト
    console.log('🔍 Testing Vite proxy connection...');
    try {
      const startTime = Date.now();
      const proxyWs = new WebSocket('ws://localhost:5173/ws');
      await waitForConnection(proxyWs);
      const latency = Date.now() - startTime;

      diagnosticResults.push({
        type: 'proxy',
        status: 'success',
        latency
      });

      // テストメッセージ送信
      proxyWs.send(JSON.stringify({
        type: 'join-room',
        roomId: 'diagnostic-proxy-room',
        participantId: 'diagnostic-proxy-user',
        displayName: 'Diagnostic Proxy User'
      }));

      setTimeout(() => proxyWs.close(), 1000);
      console.log('✅ Proxy connection successful');
    } catch (error) {
      diagnosticResults.push({
        type: 'proxy',
        status: 'error',
        error
      });
      console.error('❌ Proxy connection failed:', error);
    }

    setResults(diagnosticResults);
    setIsRunning(false);
    return diagnosticResults;
  }, [isRunning]);

  const reset = useCallback(() => {
    setResults([]);
  }, []);

  return {
    diagnose,
    reset,
    isRunning,
    results
  };
};
