import { useState, useEffect, useRef, useCallback } from "react";
import type { Participant, ChatMessage } from "@shared/schema";
import { logger } from "@/lib/logger";
import { useMediaSettings } from "@/hooks/use-media-settings";
import { useSocketIO } from "@/hooks/use-socketio";
import { useWebRTCStore } from "@/stores/webrtc-store";

export interface UseWebRTCReturn {
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  recordedChunks: Blob[];
  connectionStatus: "connecting" | "connected" | "disconnected" | "failed";
  chatMessages: ChatMessage[];
  participantId: string;
  sendChatMessage: (message: string) => void;
  requestChatHistory: () => void;
  refreshMediaSettings: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  downloadRecording: () => void;
  leaveCall: () => void;
}

export function useWebRTC(roomId: string, displayName: string): UseWebRTCReturn {
  console.log("=== useWebRTC Hook Initialization (Zustand + Socket.IO) ===");
  console.log("useWebRTC - roomId:", roomId, "displayName:", displayName);
  
  // Early validation
  if (!roomId || typeof roomId !== 'string' || roomId.length === 0) {
    console.error("❌ Invalid roomId:", roomId);
    throw new Error("Invalid roomId provided to useWebRTC");
  }
  
  if (!displayName || typeof displayName !== 'string' || displayName.length === 0) {
    console.error("❌ Invalid displayName:", displayName);
    throw new Error("Invalid displayName provided to useWebRTC");
  }

  // Zustand store
  const store = useWebRTCStore();
  const {
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isRecording,
    recordedChunks,
    connectionStatus,
    chatMessages,
    participantId: storeParticipantId,
    // Actions
    joinRoom,
    leaveRoom,
    setLocalStream,
    addRemoteStream,
    removeRemoteStream,
    addPeerConnection,
    removePeerConnection,
    toggleAudio,
    toggleVideo,
    setScreenSharing,
    startRecording: storeStartRecording,
    stopRecording: storeStopRecording,
    addRecordedChunk,
    cleanup,
  } = store;

  // Media settings hook
  const { getMediaConstraints, refreshDevices } = useMediaSettings();
  
  // Generate a unique session ID for this browser tab/instance
  const sessionId = useRef<string>(storeParticipantId || `${displayName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Socket.IO connection
  const { socket, isConnected, sendMessage, joinRoom: socketJoinRoom, leaveRoom: socketLeaveRoom } = useSocketIO(roomId, displayName);

  // Local state for backwards compatibility
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number>();

  // Track state refs to avoid stale closures
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Initialize room connection
  useEffect(() => {
    if (!roomId || !displayName || !isConnected) {
      return;
    }

    console.log("🚪 Joining room via Socket.IO...");
    joinRoom(roomId, displayName, sessionId.current);
    socketJoinRoom(roomId, displayName, sessionId.current);
  }, [roomId, displayName, isConnected, joinRoom, socketJoinRoom]);

  // Initialize local media stream
  useEffect(() => {
    let isMounted = true;

    const initializeLocalStream = async () => {
      try {
        console.log("🎥 Initializing local media stream...");
        const constraints = getMediaConstraints();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!isMounted) {
          // Component was unmounted, stop the stream
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Apply initial audio/video settings
        stream.getAudioTracks().forEach(track => {
          track.enabled = isAudioEnabled;
        });
        stream.getVideoTracks().forEach(track => {
          track.enabled = isVideoEnabled;
        });

        console.log("✅ Local stream initialized");
      } catch (error) {
        console.error("❌ Failed to get user media:", error);
        store.addError("Failed to access camera/microphone", "media");
      }
    };

    initializeLocalStream();

    return () => {
      isMounted = false;
    };
  }, [getMediaConstraints, isAudioEnabled, isVideoEnabled, setLocalStream, store]);

  // WebRTC signaling handling
  useEffect(() => {
    const handleWebRTCSignal = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const data = customEvent.detail;
      console.log("📡 Handling WebRTC signal:", data);

      try {
        const { type, fromParticipantId, payload } = data;

        if (!fromParticipantId || fromParticipantId === sessionId.current) {
          return; // Ignore own messages
        }

        let peerConnection = peerConnections.current.get(fromParticipantId);

        // Create peer connection if it doesn't exist
        if (!peerConnection) {
          peerConnection = createPeerConnection(fromParticipantId);
          peerConnections.current.set(fromParticipantId, peerConnection);
          addPeerConnection(fromParticipantId, peerConnection);
        }

        switch (type) {
          case 'offer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            sendMessage('webrtc-signal', {
              type: 'answer',
              targetParticipantId: fromParticipantId,
              payload: answer,
            });
            break;

          case 'answer':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
            break;

          case 'ice-candidate':
            if (payload) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(payload));
            }
            break;
        }
      } catch (error) {
        console.error("❌ Error handling WebRTC signal:", error);
        store.addError("WebRTC signaling error", "peer");
      }
    };

    window.addEventListener('webrtc-signal', handleWebRTCSignal);

    return () => {
      window.removeEventListener('webrtc-signal', handleWebRTCSignal);
    };
  }, [sendMessage, addPeerConnection, store]);

  // Create peer connection
  const createPeerConnection = useCallback((participantId: string): RTCPeerConnection => {
    console.log(`🔗 Creating peer connection for ${participantId}`);

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming stream
    peerConnection.ontrack = (event) => {
      console.log(`📺 Received remote stream from ${participantId}`);
      const [remoteStream] = event.streams;
      addRemoteStream(participantId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 Sending ICE candidate to ${participantId}`);
        sendMessage('webrtc-signal', {
          type: 'ice-candidate',
          targetParticipantId: participantId,
          payload: event.candidate,
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔌 Peer connection state changed for ${participantId}:`, peerConnection.connectionState);
      store.updatePeerConnectionState(participantId, peerConnection.connectionState, peerConnection.iceConnectionState);
      
      if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
        removeRemoteStream(participantId);
        removePeerConnection(participantId);
        peerConnections.current.delete(participantId);
      }
    };

    return peerConnection;
  }, [sendMessage, addRemoteStream, removeRemoteStream, addPeerConnection, removePeerConnection, store]);

  // Initialize peer connections for existing participants
  useEffect(() => {
    participants.forEach(participant => {
      const participantIdStr = String(participant.id);
      if (participantIdStr !== sessionId.current && !peerConnections.current.has(participantIdStr)) {
        const peerConnection = createPeerConnection(participantIdStr);
        peerConnections.current.set(participantIdStr, peerConnection);
        addPeerConnection(participantIdStr, peerConnection);

        // Create and send offer
        if (localStreamRef.current) {
          peerConnection.createOffer().then(offer => {
            peerConnection.setLocalDescription(offer);
            sendMessage('webrtc-signal', {
              type: 'offer',
              targetParticipantId: participantIdStr,
              payload: offer,
            });
          }).catch(error => {
            console.error("❌ Failed to create offer:", error);
          });
        }
      }
    });
  }, [participants, createPeerConnection, addPeerConnection, sendMessage]);

  // Chat functions
  const sendChatMessage = useCallback((message: string) => {
    if (!socket || !isConnected) {
      console.warn("Cannot send chat message: not connected");
      return;
    }

    sendMessage('chat-message', {
      roomId,
      message,
    });
  }, [socket, isConnected, sendMessage, roomId]);

  const requestChatHistory = useCallback(() => {
    if (!socket || !isConnected) {
      console.warn("Cannot request chat history: not connected");
      return;
    }

    sendMessage('request-chat-history', {
      roomId,
    });
  }, [socket, isConnected, sendMessage, roomId]);

  // Screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        screenStreamRef.current = screenStream;
        setScreenSharing(true);

        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(async (peerConnection, participantId) => {
          const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        });

        // Handle screen share end
        videoTrack.onended = () => {
          setScreenSharing(false);
          screenStreamRef.current = null;
          
          // Switch back to camera
          if (localStreamRef.current) {
            const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
            peerConnections.current.forEach(async (peerConnection) => {
              const sender = peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
              );
              if (sender && cameraVideoTrack) {
                await sender.replaceTrack(cameraVideoTrack);
              }
            });
          }
        };
      } else {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        setScreenSharing(false);

        // Switch back to camera
        if (localStreamRef.current) {
          const cameraVideoTrack = localStreamRef.current.getVideoTracks()[0];
          peerConnections.current.forEach(async (peerConnection) => {
            const sender = peerConnection.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender && cameraVideoTrack) {
              await sender.replaceTrack(cameraVideoTrack);
            }
          });
        }
      }
    } catch (error) {
      console.error("❌ Screen sharing error:", error);
      store.addError("Screen sharing failed", "media");
    }
  }, [isScreenSharing, setScreenSharing, store]);

  // Recording functions
  const startRecording = useCallback(() => {
    if (!localStreamRef.current) {
      console.warn("Cannot start recording: no local stream");
      return;
    }

    try {
      const mediaRecorder = new MediaRecorder(localStreamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorderRef.current = mediaRecorder;
      storeStartRecording(mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          addRecordedChunk(event.data);
        }
      };

      mediaRecorder.start();
      console.log("🎬 Recording started");
    } catch (error) {
      console.error("❌ Recording start failed:", error);
      store.addError("Recording failed to start", "media");
    }
  }, [storeStartRecording, addRecordedChunk, store]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      storeStopRecording();
      console.log("🛑 Recording stopped");
    }
  }, [storeStopRecording]);

  const downloadRecording = useCallback(() => {
    if (recordedChunks.length === 0) {
      console.warn("No recorded chunks available");
      return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `meetsonar-recording-${new Date().toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [recordedChunks]);

  // Enhanced leave call with comprehensive cleanup
  const leaveCall = useCallback(() => {
    console.log("🚪 Leaving call...");
    
    // Leave via Socket.IO
    socketLeaveRoom();
    
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`🔇 Stopping track: ${track.kind} (${track.label})`);
        track.stop();
      });
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.warn("Warning: Could not stop media recorder:", error);
      }
      mediaRecorderRef.current = null;
    }

    // Cancel animation frames
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = undefined;
    }

    // Close all peer connections
    peerConnections.current.forEach((pc, participantId) => {
      console.log(`🔌 Closing peer connection for ${participantId}`);
      pc.close();
    });
    peerConnections.current.clear();

    // Store cleanup
    cleanup();
    
    console.log("✅ Leave call cleanup completed");
  }, [socketLeaveRoom, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    const cleanup = () => {
      console.log("🔄 Component unmounting - executing cleanup...");
      leaveCall();
    };

    return cleanup;
  }, [leaveCall]);

  // Refresh media settings
  const refreshMediaSettings = useCallback(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isRecording,
    recordedChunks,
    connectionStatus,
    chatMessages,
    participantId: sessionId.current,
    sendChatMessage,
    requestChatHistory,
    refreshMediaSettings,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    downloadRecording,
    leaveCall,
  };
}
