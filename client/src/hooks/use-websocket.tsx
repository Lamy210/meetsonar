import { useState, useEffect, useRef, useCallback } from "react";

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any;
}

export function useWebSocket(path: string, roomId?: string): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // WebSocket URL の決定
    const isProduction = import.meta.env.PROD;
    let wsUrl: string;
    
    if (isProduction) {
      // 本番環境では現在のホストを使用
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}${path}`;
    } else {
      // 開発環境では環境変数または現在のホスト（Viteプロキシ）を使用
      const envWsUrl = import.meta.env.VITE_WS_URL;
      if (envWsUrl) {
        wsUrl = envWsUrl + path;
      } else {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}${path}`;
      }
    }
    
    console.log('Connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      socket.close();
    };
  }, [path]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    sendMessage,
    lastMessage,
  };
}
