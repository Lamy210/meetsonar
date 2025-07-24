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

    // 1. 直接バックエンド接続テスト
    console.log('🔍 Testing direct backend connection...');
    try {
      const startTime = Date.now();
      const directWs = new WebSocket('ws://localhost:5000/ws');
      await waitForConnection(directWs);
      const latency = Date.now() - startTime;
      
      diagnosticResults.push({ 
        type: 'direct', 
        status: 'success',
        latency 
      });
      
      // テストメッセージ送信
      directWs.send(JSON.stringify({
        type: 'join-room',
        roomId: 'diagnostic-room',
        participantId: 'diagnostic-user',
        displayName: 'Diagnostic User'
      }));
      
      setTimeout(() => directWs.close(), 1000);
      console.log('✅ Direct connection successful');
    } catch (error) {
      diagnosticResults.push({ 
        type: 'direct', 
        status: 'error', 
        error 
      });
      console.error('❌ Direct connection failed:', error);
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
