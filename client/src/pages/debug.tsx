import React, { useState, useEffect } from 'react';
import { useWebRTC } from '@/hooks/use-webrtc';

// Capture console logs
const logs: string[] = [];
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logs.push(`[LOG] ${new Date().toLocaleTimeString()}: ${message}`);
  originalLog(...args);
};

console.error = (...args) => {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');
  logs.push(`[ERROR] ${new Date().toLocaleTimeString()}: ${message}`);
  originalError(...args);
};

const WebRTCDebugPage = () => {
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);
  const [roomId, setRoomId] = useState('debug-room');
  const [displayName, setDisplayName] = useState('DebugUser');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Use WebRTC hook conditionally
  const webRTC = isConnecting ? useWebRTC(roomId, displayName) : null;
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayLogs([...logs.slice(-50)]); // Show last 50 logs
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const startConnection = () => {
    logs.push(`[INFO] ${new Date().toLocaleTimeString()}: Starting WebRTC connection test...`);
    setIsConnecting(true);
  };

  const stopConnection = () => {
    logs.push(`[INFO] ${new Date().toLocaleTimeString()}: Stopping WebRTC connection test...`);
    setIsConnecting(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>WebRTC Debug Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Room ID: </label>
        <input 
          value={roomId} 
          onChange={(e) => setRoomId((e.target as HTMLInputElement).value)}
          disabled={isConnecting}
        />
        <label style={{ marginLeft: '20px' }}>Display Name: </label>
        <input 
          value={displayName} 
          onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
          disabled={isConnecting}
        />
        <button 
          onClick={isConnecting ? stopConnection : startConnection}
          style={{ marginLeft: '20px' }}
        >
          {isConnecting ? 'Stop Connection' : 'Start Connection'}
        </button>
      </div>
      
      {webRTC && (
        <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
          <h3>Connection Status</h3>
          <p>Status: {webRTC.connectionStatus}</p>
          <p>Participants: {webRTC.participants.length}</p>
          <p>Participant ID: {webRTC.participantId}</p>
          <p>Chat Messages: {webRTC.chatMessages.length}</p>
        </div>
      )}
      
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        height: '400px', 
        overflowY: 'scroll',
        backgroundColor: '#f5f5f5'
      }}>
        {displayLogs.map((log, index) => (
          <div key={index} style={{ 
            marginBottom: '5px',
            color: log.includes('[ERROR]') ? 'red' : log.includes('[INFO]') ? 'blue' : 'black',
            fontSize: '12px'
          }}>
            {log}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => {
          logs.length = 0;
          setDisplayLogs([]);
        }}>
          Clear Logs
        </button>
        <span style={{ marginLeft: '20px' }}>
          Total logs: {logs.length}
        </span>
      </div>
    </div>
  );
};

export default WebRTCDebugPage;
