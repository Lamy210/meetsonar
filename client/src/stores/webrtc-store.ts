import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Socket } from 'socket.io-client';
import type { Participant, ChatMessage } from "@shared/schema-sqlite";

// WebRTC接続状態の型定義
export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "failed";

// ピア接続情報の型定義
export interface PeerConnectionInfo {
  connection: RTCPeerConnection;
  stream?: MediaStream;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  lastActivity: number;
}

// WebRTCストアの状態型定義
interface WebRTCState {
  // Basic state
  roomId: string | null;
  displayName: string | null;
  participantId: string | null;
  connectionStatus: ConnectionStatus;

  // Participants and streams
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  peerConnections: Map<string, PeerConnectionInfo>;

  // Media controls
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  screenStream: MediaStream | null;

  // Recording
  isRecording: boolean;
  recordedChunks: Blob[];
  mediaRecorder: MediaRecorder | null;

  // Chat
  chatMessages: ChatMessage[];
  unreadCount: number;

  // Socket.IO connection
  socket: Socket | null;
  reconnectAttempts: number;
  maxRetries: number;

  // Error handling
  lastError: string | null;
  errors: Array<{ id: string; message: string; timestamp: number; type: 'connection' | 'media' | 'peer' | 'chat' }>;
}

// Actions interface
interface WebRTCActions {
  // Connection management
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSocket: (socket: Socket | null) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Room management
  joinRoom: (roomId: string, displayName: string, participantId: string) => void;
  leaveRoom: () => void;

  // Participants
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  setParticipants: (participants: Participant[]) => void;

  // Streams
  setLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (participantId: string, stream: MediaStream) => void;
  removeRemoteStream: (participantId: string) => void;
  setScreenStream: (stream: MediaStream | null) => void;

  // Peer connections
  addPeerConnection: (participantId: string, connection: RTCPeerConnection, stream?: MediaStream) => void;
  removePeerConnection: (participantId: string) => void;
  updatePeerConnectionState: (participantId: string, connectionState: RTCPeerConnectionState, iceConnectionState?: RTCIceConnectionState) => void;
  updatePeerActivity: (participantId: string) => void;

  // Media controls
  toggleAudio: () => void;
  toggleVideo: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;

  // Recording
  startRecording: (recorder: MediaRecorder) => void;
  stopRecording: () => void;
  addRecordedChunk: (chunk: Blob) => void;
  clearRecordedChunks: () => void;

  // Chat
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  clearUnreadCount: () => void;

  // Error handling
  addError: (message: string, type: 'connection' | 'media' | 'peer' | 'chat') => void;
  clearError: (errorId: string) => void;
  clearAllErrors: () => void;

  // Cleanup
  reset: () => void;
  cleanup: () => void;
}

// 初期状態
const initialState: WebRTCState = {
  roomId: null,
  displayName: null,
  participantId: null,
  connectionStatus: "disconnected",

  participants: [],
  localStream: null,
  remoteStreams: new Map(),
  peerConnections: new Map(),

  isAudioEnabled: true,
  isVideoEnabled: false,
  isScreenSharing: false,
  screenStream: null,

  isRecording: false,
  recordedChunks: [],
  mediaRecorder: null,

  chatMessages: [],
  unreadCount: 0,

  socket: null,
  reconnectAttempts: 0,
  maxRetries: 5,

  lastError: null,
  errors: [],
};

// Zustand store with Immer middleware
export const useWebRTCStore = create<WebRTCState & WebRTCActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // Connection management
      setConnectionStatus: (status) => set((state) => {
        state.connectionStatus = status;
        if (status === 'connected') {
          state.reconnectAttempts = 0;
        }
      }),

      setSocket: (socket) => set({ socket }),

      incrementReconnectAttempts: () => set((state) => {
        state.reconnectAttempts += 1;
      }),

      resetReconnectAttempts: () => set((state) => {
        state.reconnectAttempts = 0;
      }),

      // Room management
      joinRoom: (roomId, displayName, participantId) => set((state) => {
        state.roomId = roomId;
        state.displayName = displayName;
        state.participantId = participantId;
        state.connectionStatus = "connecting";
      }),

      leaveRoom: () => set((state) => {
        state.roomId = null;
        state.displayName = null;
        state.participantId = null;
        state.connectionStatus = "disconnected";
        state.participants = [];
        state.chatMessages = [];
        state.unreadCount = 0;
      }),

      // Participants
      addParticipant: (participant) => set((state) => {
        const existingIndex = state.participants.findIndex(p => p.id === participant.id);
        if (existingIndex >= 0) {
          state.participants[existingIndex] = participant;
        } else {
          state.participants.push(participant);
        }
      }),

      removeParticipant: (participantId) => set((state) => {
        state.participants = state.participants.filter(p => String(p.id) !== participantId);
      }),

      updateParticipant: (participantId, updates) => set((state) => {
        const participant = state.participants.find(p => String(p.id) === participantId);
        if (participant) {
          Object.assign(participant, updates);
        }
      }),

      setParticipants: (participants) => set((state) => {
        state.participants = participants;
      }),

      // Streams
      setLocalStream: (stream) => set((state) => {
        state.localStream = stream;
      }),

      addRemoteStream: (participantId, stream) => set((state) => {
        state.remoteStreams.set(participantId, stream);
      }),

      removeRemoteStream: (participantId) => set((state) => {
        state.remoteStreams.delete(participantId);
      }),

      setScreenStream: (stream) => set((state) => {
        state.screenStream = stream;
      }),

      // Peer connections
      addPeerConnection: (participantId, connection, stream) => set((state) => {
        state.peerConnections.set(participantId, {
          connection,
          stream,
          connectionState: connection.connectionState,
          iceConnectionState: connection.iceConnectionState,
          lastActivity: Date.now(),
        });
      }),

      removePeerConnection: (participantId) => set((state) => {
        state.peerConnections.delete(participantId);
      }),

      updatePeerConnectionState: (participantId, connectionState, iceConnectionState) => set((state) => {
        const peerInfo = state.peerConnections.get(participantId);
        if (peerInfo) {
          peerInfo.connectionState = connectionState;
          if (iceConnectionState) {
            peerInfo.iceConnectionState = iceConnectionState;
          }
          peerInfo.lastActivity = Date.now();
        }
      }),

      updatePeerActivity: (participantId) => set((state) => {
        const peerInfo = state.peerConnections.get(participantId);
        if (peerInfo) {
          peerInfo.lastActivity = Date.now();
        }
      }),

      // Media controls
      toggleAudio: () => set((state) => {
        state.isAudioEnabled = !state.isAudioEnabled;
        if (state.localStream) {
          state.localStream.getAudioTracks().forEach(track => {
            track.enabled = state.isAudioEnabled;
          });
        }
      }),

      toggleVideo: () => set((state) => {
        state.isVideoEnabled = !state.isVideoEnabled;
        if (state.localStream) {
          state.localStream.getVideoTracks().forEach(track => {
            track.enabled = state.isVideoEnabled;
          });
        }
      }),

      setAudioEnabled: (enabled) => set((state) => {
        state.isAudioEnabled = enabled;
        if (state.localStream) {
          state.localStream.getAudioTracks().forEach(track => {
            track.enabled = enabled;
          });
        }
      }),

      setVideoEnabled: (enabled) => set((state) => {
        state.isVideoEnabled = enabled;
        if (state.localStream) {
          state.localStream.getVideoTracks().forEach(track => {
            track.enabled = enabled;
          });
        }
      }),

      setScreenSharing: (sharing) => set((state) => {
        state.isScreenSharing = sharing;
      }),

      // Recording
      startRecording: (recorder) => set((state) => {
        state.isRecording = true;
        state.mediaRecorder = recorder;
        state.recordedChunks = [];
      }),

      stopRecording: () => set((state) => {
        state.isRecording = false;
        state.mediaRecorder = null;
      }),

      addRecordedChunk: (chunk) => set((state) => {
        state.recordedChunks.push(chunk);
      }),

      clearRecordedChunks: () => set((state) => {
        state.recordedChunks = [];
      }),

      // Chat
      addChatMessage: (message) => set((state) => {
        state.chatMessages.push(message);
        if (message.participantId !== state.participantId) {
          state.unreadCount += 1;
        }
      }),

      setChatMessages: (messages) => set((state) => {
        state.chatMessages = messages;
      }),

      clearUnreadCount: () => set((state) => {
        state.unreadCount = 0;
      }),

      // Error handling
      addError: (message, type) => set((state) => {
        const error = {
          id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message,
          type,
          timestamp: Date.now(),
        };
        state.errors.push(error);
        state.lastError = message;

        // Keep only last 10 errors to prevent memory buildup
        if (state.errors.length > 10) {
          state.errors = state.errors.slice(-10);
        }
      }),

      clearError: (errorId) => set((state) => {
        state.errors = state.errors.filter(error => error.id !== errorId);
        if (state.errors.length === 0) {
          state.lastError = null;
        }
      }),

      clearAllErrors: () => set((state) => {
        state.errors = [];
        state.lastError = null;
      }),

      // Cleanup
      reset: () => set(() => ({ ...initialState })),

      cleanup: () => set((state) => {
        // Stop all media tracks
        if (state.localStream) {
          state.localStream.getTracks().forEach(track => track.stop());
        }
        if (state.screenStream) {
          state.screenStream.getTracks().forEach(track => track.stop());
        }
        state.remoteStreams.forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });

        // Close all peer connections
        state.peerConnections.forEach(({ connection }) => {
          if (connection.connectionState !== 'closed') {
            connection.close();
          }
        });

        // Stop recording
        if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
          try {
            state.mediaRecorder.stop();
          } catch (error) {
            console.warn('Could not stop media recorder:', error);
          }
        }

        // Disconnect Socket.IO
        if (state.socket && state.socket.connected) {
          state.socket.disconnect();
        }

        // Reset to initial state
        Object.assign(state, initialState);
      }),
    }))
  )
);

// Selector hooks for optimized re-renders
export const useConnectionStatus = () => useWebRTCStore(state => state.connectionStatus);
export const useParticipants = () => useWebRTCStore(state => state.participants);
export const useLocalStream = () => useWebRTCStore(state => state.localStream);
export const useRemoteStreams = () => useWebRTCStore(state => state.remoteStreams);
export const useMediaControls = () => useWebRTCStore(state => ({
  isAudioEnabled: state.isAudioEnabled,
  isVideoEnabled: state.isVideoEnabled,
  isScreenSharing: state.isScreenSharing,
  toggleAudio: state.toggleAudio,
  toggleVideo: state.toggleVideo,
  setScreenSharing: state.setScreenSharing,
}));
export const useChatMessages = () => useWebRTCStore(state => state.chatMessages);
export const useUnreadCount = () => useWebRTCStore(state => state.unreadCount);
export const useErrors = () => useWebRTCStore(state => state.errors);
