import { useState, useEffect, useRef, useCallback } from "react";

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  sendMessage: (message: any) => void;
  lastMessage: any;
  reconnect: () => void;
}

interface WebSocketConfig {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

export function useWebSocket(
  path: string, 
  roomId?: string,
  config: WebSocketConfig = {}
): UseWebSocketReturn {
  const {
    maxReconnectAttempts = 5,
    reconnectDelay = 1000,
    heartbeatInterval = 30000
  } = config;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [lastMessage, setLastMessage] = useState<any>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    heartbeatIntervalRef.current = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
        
        // Set timeout for pong response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('Heartbeat timeout - closing connection');
          socketRef.current?.close();
        }, 5000);
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setConnectionState(reconnectAttempts.current > 0 ? 'reconnecting' : 'connecting');

    // WebSocket URL の決定
    const isProduction = import.meta.env.PROD;
    let wsUrl: string;
    
    if (isProduction) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}${path}`;
    } else {
      const envWsUrl = import.meta.env.VITE_WS_URL;
      if (envWsUrl) {
        wsUrl = envWsUrl + path;
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}${path}`;
      }
    }
    
    console.log(`WebSocket ${reconnectAttempts.current > 0 ? 'reconnecting' : 'connecting'} to:`, wsUrl);
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected successfully');
      setIsConnected(true);
      setConnectionState('connected');
      reconnectAttempts.current = 0;
      startHeartbeat();
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle pong response
        if (message.type === 'pong') {
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = null;
          }
          return;
        }
        
        setLastMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
      setConnectionState('disconnected');
      clearTimers();
      
      // Attempt reconnection if not intentionally closed
      if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts.current); // Exponential backoff
        reconnectAttempts.current++;
        
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        setConnectionState('disconnected');
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setConnectionState('disconnected');
    };
  }, [path, maxReconnectAttempts, reconnectDelay, startHeartbeat]);

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    if (socketRef.current) {
      socketRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      clearTimers();
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect, clearTimers]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
      return false;
    }
  }, []);

  return {
    isConnected,
    connectionState,
    sendMessage,
    lastMessage,
    reconnect,
  };
}
