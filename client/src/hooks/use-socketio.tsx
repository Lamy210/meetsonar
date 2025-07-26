import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebRTCStore } from '@/stores/webrtc-store';

interface UseSocketIOReturn {
  socket: Socket | null;
  isConnected: boolean;
  sendMessage: (event: string, data: any) => void;
  joinRoom: (roomId: string, displayName: string, participantId: string) => void;
  leaveRoom: () => void;
}

export function useSocketIO(roomId?: string, displayName?: string): UseSocketIOReturn {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnectionStatus,
    setSocket,
    addParticipant,
    removeParticipant,
    setParticipants,
    addChatMessage,
    setChatMessages,
    addError,
    participantId,
  } = useWebRTCStore();

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!roomId || !displayName) {
      return;
    }

    console.log('🔌 Initializing Socket.IO connection...');

    // Determine WebSocket URL
    const isProduction = import.meta.env.PROD;
    let socketUrl: string;

    if (isProduction) {
      const protocol = window.location.protocol === "https:" ? "https:" : "http:";
      socketUrl = `${protocol}//${window.location.host}`;
    } else {
      // Development environment - connect directly to the Socket.IO server
      socketUrl = 'http://localhost:5000';
    }

    // Create Socket.IO client
    const socket = io(socketUrl, {
      // Connection options
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      transports: ['websocket', 'polling'],

      // Query parameters
      query: {
        roomId,
        displayName,
      },

      // Authentication (for future use)
      auth: {
        // token: localStorage.getItem('auth_token'), // Add JWT token if available
      },
    });

    socketRef.current = socket;
    setSocket(socket as any);

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      setConnectionStatus('disconnected');

      if (reason === 'io server disconnect') {
        // Server disconnected the socket, reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('🔥 Socket.IO connection error:', error);
      setConnectionStatus('failed');
      addError(error.message || 'Connection failed', 'connection');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
      setConnectionStatus('connected');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Socket.IO reconnection attempt', attemptNumber);
      setConnectionStatus('connecting');
    });

    socket.on('reconnect_error', (error) => {
      console.error('🔄❌ Socket.IO reconnection error:', error);
      addError('Reconnection failed', 'connection');
    });

    socket.on('reconnect_failed', () => {
      console.error('💀 Socket.IO reconnection failed');
      setConnectionStatus('failed');
      addError('Reconnection failed after multiple attempts', 'connection');
    });

    // Room event handlers
    socket.on('room-joined', (data) => {
      console.log('🏠 Joined room:', data);
      if (data.payload?.participants) {
        setParticipants(data.payload.participants);
      }
    });

    socket.on('participant-joined', (data) => {
      console.log('👤 Participant joined:', data);
      if (data.payload?.participants) {
        setParticipants(data.payload.participants);
      } else {
        // Add single participant if full list not provided
        addParticipant({
          id: Date.now(), // 一意のIDとして現在時刻を使用
          displayName: data.payload?.displayName || 'Unknown',
          joinedAt: new Date().toISOString(),
          roomId: data.roomId || roomId,
          userId: null,
          isHost: false,
          isMuted: false,
          isVideoEnabled: true,
          connectionId: data.participantId,
        });
      }
    });

    socket.on('participant-left', (data) => {
      console.log('👋 Participant left:', data);
      removeParticipant(data.participantId);
    });

    // Chat event handlers
    socket.on('chat-message', (data) => {
      console.log('💬 Chat message received:', data);
      if (data.payload) {
        addChatMessage(data.payload);
      }
    });

    socket.on('chat-history', (data) => {
      console.log('📚 Chat history received:', data);
      if (data.payload?.messages) {
        setChatMessages(data.payload.messages);
      }
    });

    // WebRTC signaling event handlers
    socket.on('webrtc-signal', (data) => {
      console.log('📡 WebRTC signal received:', data);
      // This will be handled by the WebRTC hook
      // Emit custom event for WebRTC hook to listen
      window.dispatchEvent(new CustomEvent('webrtc-signal', { detail: data }));
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('⚠️ Socket.IO error:', error);
      addError(error.message || 'Socket error', 'connection');
    });

    // Heartbeat handling
    socket.on('pong', () => {
      console.log('🏓 Pong received');
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection...');
      if (socket.connected) {
        socket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
    };
  }, [roomId, displayName, participantId]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot send message: Socket not connected');
      addError('Cannot send message: Not connected', 'connection');
    }
  }, [addError]);

  const joinRoom = useCallback((roomId: string, displayName: string, participantId: string) => {
    console.log('🚪 Joining room:', { roomId, displayName, participantId });
    sendMessage('join-room', {
      type: 'join-room',
      roomId,
      participantId,
      payload: { displayName },
    });
  }, [sendMessage]);

  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving room...');
    sendMessage('leave-room', {});
  }, [sendMessage]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    sendMessage,
    joinRoom,
    leaveRoom,
  };
}
