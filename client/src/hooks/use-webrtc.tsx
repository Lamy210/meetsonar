import { useState, useEffect, useRef, useCallback } from "react";
import type { Participant, ChatMessage } from "@shared/schema";
import { logger } from "@/lib/logger";

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
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  downloadRecording: () => void;
  leaveCall: () => void;
}

export function useWebRTC(roomId: string, displayName: string): UseWebRTCReturn {
  console.log("useWebRTC - roomId:", roomId, "displayName:", displayName);
  
  // Generate a unique session ID for this browser tab/instance
  const sessionId = useRef<string>(`${displayName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map<string, MediaStream>());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "failed">("connecting");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // track state refs to avoid stale closures
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const isRecordingRef = useRef(isRecording);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // store RAF id for recording loop
  const animationFrameIdRef = useRef<number>();

  // Initialize WebSocket connection
  useEffect(() => {
    // 開発環境ではAPIサーバー（port 5000）に接続
    const apiHost = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const wsHost = apiHost.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const protocol = apiHost.startsWith('https:') ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${wsHost}/ws`;

    console.log('=== WebSocket Connection Debug ===');
    console.log('API Host:', apiHost);
    console.log('WS Host:', wsHost);
    console.log('Protocol:', protocol);
    console.log('Final WebSocket URL:', wsUrl);
    console.log('Room ID:', roomId);
    console.log('Display Name:', displayName);
    console.log('Session ID:', sessionId.current);

    console.log('WebRTC connecting to WebSocket:', wsUrl);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    // 接続タイムアウトを設定
    const connectionTimeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        console.error('⏰ WebSocket connection timeout');
        socket.close();
        setConnectionStatus("failed");
      }
    }, 10000); // 10秒タイムアウト

    socket.onopen = () => {
      console.log('✅ WebSocket connection opened successfully');
      clearTimeout(connectionTimeout);
      setConnectionStatus("connected");
      console.log(`🔗 WebSocket connected to room: ${roomId} with sessionId: ${sessionId.current}`);
      // Join room
      const joinMessage = {
        type: "join-room",
        roomId,
        participantId: sessionId.current,
        payload: { displayName }
      };
      console.log('Sending join-room message:', joinMessage);
      socket.send(JSON.stringify(joinMessage));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', message);
        await handleSignalingMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log('❌ WebSocket connection closed:', event.code, event.reason);
      clearTimeout(connectionTimeout);
      setConnectionStatus("disconnected");
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      clearTimeout(connectionTimeout);
      setConnectionStatus("failed");
    };

    // 接続状態を定期的にチェック
    const statusInterval = setInterval(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        console.log('⏳ WebSocket still connecting...');
      } else if (socket.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket connection is open');
      } else if (socket.readyState === WebSocket.CLOSING) {
        console.log('⚠️ WebSocket connection is closing');
      } else if (socket.readyState === WebSocket.CLOSED) {
        console.log('❌ WebSocket connection is closed');
        clearInterval(statusInterval);
      }
    }, 2000);

    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      clearTimeout(connectionTimeout);
      clearInterval(statusInterval);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "leave-room",
          roomId,
          participantId: sessionId.current,
          payload: {}
        }));
      }
      socket.close();
    };
  }, [roomId, displayName]);

  // Initialize local stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Set initial states
        stream.getAudioTracks().forEach(track => {
          track.enabled = isAudioEnabled;
          logger.debug("Audio track initialized:", track.label, track.enabled);
        });
        stream.getVideoTracks().forEach(track => {
          track.enabled = isVideoEnabled;
          logger.debug("Video track initialized:", track.label, track.enabled);
        });

        logger.info("Local stream initialized:", {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
        });
      } catch (error) {
        logger.error("Failed to get user media:", error);
      }
    };

    initializeLocalStream();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSignalingMessage = useCallback(async (message: any) => {
    console.log("Received signaling message:", message);
    console.log("Message payload:", message.payload);

    switch (message.type) {
      case "participant-joined":
        const newParticipant = message.payload.participant;
        const allParticipants = message.payload.participants;
        
        console.log("New participant joined:", newParticipant);
        console.log("All participants:", allParticipants);
        
        if (!newParticipant) {
          console.warn("No participant data in participant-joined message");
          break;
        }
        
        // 全体の参加者リストを更新（重複排除）
        if (allParticipants && Array.isArray(allParticipants)) {
          setParticipants(prev => {
            // 新しいリストから重複を除去
            const uniqueParticipants = allParticipants.filter((p: Participant, index: number, self: Participant[]) => {
              return self.findIndex((participant: Participant) => participant.connectionId === p.connectionId) === index;
            });
            console.log("Setting participants with deduplication:", uniqueParticipants.length, "participants");
            return uniqueParticipants;
          });
        } else {
          // 個別追加（フォールバック）
          setParticipants(prev => {
            const exists = prev.some(p => p.connectionId === newParticipant.connectionId);
            if (exists) {
              console.warn("Participant already exists:", newParticipant.connectionId);
              return prev;
            }
            console.log("Adding new participant:", newParticipant.connectionId);
            return [...prev, newParticipant];
          });
        }
        
        // Create peer connection for the new participant (only if it's not us)
        if (newParticipant.connectionId !== sessionId.current) {
          await createPeerConnection(newParticipant.connectionId);
        }
        break;

      case "participant-left":
        setParticipants(prev => prev.filter(p => p.connectionId !== message.payload.connectionId));
        removePeerConnection(message.payload.connectionId);
        break;

      case "participants-list":
        console.log("Received participants list:", message.payload.length, "participants", message.payload);
        const participantsList = message.payload || [];
        // 重複排除
        const uniqueParticipantsList = participantsList.filter((p: Participant, index: number, self: Participant[]) => {
          return self.findIndex((participant: Participant) => participant.connectionId === p.connectionId) === index;
        });
        console.log("Setting deduplicated participants list:", uniqueParticipantsList.length, "participants");
        setParticipants(uniqueParticipantsList);
        // Create peer connections for existing participants
        for (const participant of uniqueParticipantsList) {
          if (participant.connectionId !== sessionId.current) {
            console.log("Creating peer connection for existing participant:", participant.connectionId);
            await createPeerConnection(participant.connectionId);
          }
        }
        break;

      case "offer":
        await handleOffer(message.participantId, message.payload);
        break;

      case "answer":
        await handleAnswer(message.participantId, message.payload);
        break;

      case "ice-candidate":
        await handleIceCandidate(message.participantId, message.payload);
        break;

      case "participant-updated":
        setParticipants(prev => prev.map(p =>
          p.connectionId === message.participantId
            ? { ...p, ...message.payload }
            : p
        ));
        break;

      case "chat-message":
        console.log("=== CHAT MESSAGE RECEIVED ===");
        console.log("Raw message:", message);
        console.log("Payload:", message.payload);
        console.log("Current chat messages count:", chatMessages.length);
        
        if (!message.payload) {
          console.error("No payload in chat message");
          break;
        }
        
        setChatMessages(prev => {
          console.log("Previous messages:", prev);
          console.log("Previous messages count:", prev.length);
          
          // 重複チェック（IDが同じメッセージを追加しない）
          if (message.payload.id) {
            const exists = prev.some(msg => msg.id === message.payload.id);
            if (exists) {
              console.warn("Duplicate chat message received:", message.payload.id);
              return prev;
            }
          }
          
          const newMessages = [...prev, message.payload];
          console.log("Updated messages:", newMessages);
          console.log("Updated messages count:", newMessages.length);
          return newMessages;
        });
        break;

      case "chat-history":
        console.log("=== CHAT HISTORY RECEIVED ===");
        console.log("Raw message:", message);
        console.log("Payload:", message.payload);
        
        let historyMessages = [];
        if (message.payload && message.payload.messages) {
          historyMessages = message.payload.messages;
        } else if (Array.isArray(message.payload)) {
          historyMessages = message.payload;
        } else {
          console.warn("Invalid chat history format:", message.payload);
          historyMessages = [];
        }
        
        console.log("Extracted history messages:", historyMessages);
        console.log("History messages count:", historyMessages.length);
        console.log("History messages type check:", Array.isArray(historyMessages));
        
        setChatMessages(historyMessages);
        console.log("✅ Set chat messages from history - count:", historyMessages.length);
        break;
    }
  }, [displayName]);

  const createPeerConnection = async (participantId: string) => {
    // Check if peer connection already exists and is in good state
    const existingPc = peerConnections.current.get(participantId);
    if (existingPc && existingPc.connectionState !== 'closed' && existingPc.connectionState !== 'failed') {
      console.log("Reusing existing peer connection for:", participantId, "state:", existingPc.connectionState);

      // Make sure local tracks are properly added to existing connection
      if (localStreamRef.current) {
        const senders = existingPc.getSenders();
        const localTracks = localStreamRef.current.getTracks();

        console.log("Checking existing senders:", senders.map(s => s.track?.kind || 'null'));

        // Replace tracks if they're missing or different
        for (const track of localTracks) {
          const existingSender = senders.find(s => s.track?.kind === track.kind);
          if (!existingSender || !existingSender.track) {
            console.log("Adding missing track to existing connection:", track.kind);
            existingPc.addTrack(track, localStreamRef.current);
          } else if (existingSender.track !== track) {
            console.log("Replacing track in existing connection:", track.kind);
            existingSender.replaceTrack(track);
          }
        }
      }

      return; // Connection already exists and is usable
    }

    // Clean up existing failed connection
    if (existingPc) {
      console.log("Cleaning up existing peer connection for:", participantId);
      existingPc.close();
      peerConnections.current.delete(participantId);
    }

    console.log("Creating new peer connection for:", participantId);

    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    peerConnections.current.set(participantId, peerConnection);

    // Add local stream tracks
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log("Adding tracks to peer connection for:", participantId, "Track count:", tracks.length);

      tracks.forEach(track => {
        console.log("Adding track:", {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          participantId: participantId
        });

        const sender = peerConnection!.addTrack(track, localStreamRef.current!);
        console.log("Track added successfully, sender track:", sender.track?.kind, "enabled:", sender.track?.enabled);
      });
    } else {
      console.warn("No local stream available when creating peer connection for:", participantId);
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind, "from:", participantId);
      console.log("Event streams:", event.streams.length);

      const [remoteStream] = event.streams;
      if (remoteStream) {
        console.log("Remote stream details:", {
          streamId: remoteStream.id,
          audioTracks: remoteStream.getAudioTracks().length,
          videoTracks: remoteStream.getVideoTracks().length,
          participantId: participantId
        });

        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.set(participantId, remoteStream);
          console.log("Updated remote streams map. Total streams:", newMap.size);
          return newMap;
        });
      } else {
        console.warn("No remote stream in track event for:", participantId);
      }
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log("Sending ICE candidate");
        socketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          roomId,
          participantId: displayName,
          targetParticipant: participantId,
          payload: event.candidate
        }));
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state changed for ${participantId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        console.log(`Successfully connected to ${participantId}`);
        // Debug track senders
        const senders = peerConnection.getSenders();
        console.log(`Senders for ${participantId}:`, senders.length, senders.map(s => s.track?.kind || 'null'));

        // Verify all senders have tracks
        const missingSenders = senders.filter(s => !s.track);
        if (missingSenders.length > 0) {
          console.warn(`Found ${missingSenders.length} senders without tracks`);
        }
      } else if (peerConnection.connectionState === 'failed') {
        console.error(`Connection failed for ${participantId}`);
      }
    };

    // Handle ICE connection state changes  
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}:`, peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'connected') {
        console.log(`ICE connected for ${participantId}. Checking receivers...`);
        const receivers = peerConnection.getReceivers();
        console.log(`Receivers for ${participantId}:`, receivers.length, receivers.map(r => r.track?.kind));
      }
    };

    // Handle negotiation needed (important for track changes)
    peerConnection.onnegotiationneeded = async () => {
      console.log(`Negotiation needed for ${participantId}, creating new offer...`);

      if (peerConnection.signalingState === 'stable') {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          if (socketRef.current) {
            socketRef.current.send(JSON.stringify({
              type: "offer",
              roomId,
              participantId: displayName,
              targetParticipant: participantId,
              payload: offer
            }));
          }
        } catch (error) {
          console.error("Failed to handle negotiation:", error);
        }
      }
    };

    // Debug signaling state changes
    peerConnection.onsignalingstatechange = () => {
      console.log(`Signaling state changed for ${participantId}:`, peerConnection.signalingState);
    };

    // Create and send offer (only if we haven't made one already)
    try {
      // Check if we're already in an offering state
      if (peerConnection.signalingState !== 'stable') {
        console.log("Skipping offer creation - signaling state:", peerConnection.signalingState);
        return;
      }

      // Wait for local stream to be ready
      if (!localStreamRef.current) {
        console.warn("Local stream not ready when creating offer for:", participantId);
        return;
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);

      console.log("Sending offer to:", participantId, "SDP length:", offer.sdp?.length);
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: "offer",
          roomId,
          participantId: displayName,
          targetParticipant: participantId,
          payload: offer
        }));
      }
    } catch (error) {
      console.error("Failed to create offer:", error);
    }
  };

  const handleOffer = async (participantId: string, offer: RTCSessionDescriptionInit) => {
    console.log("Handling offer from:", participantId, "offer type:", offer.type);

    let peerConnection = peerConnections.current.get(participantId);

    // If we already have a connection in progress, check its state
    if (peerConnection) {
      if (peerConnection.signalingState === 'have-local-offer') {
        console.log("Collision detected - we both sent offers. Ignoring incoming offer.");
        return;
      }
      if (peerConnection.signalingState !== 'stable') {
        console.log("Connection already in progress for:", participantId, "state:", peerConnection.signalingState);
        return;
      }
    }

    if (!peerConnection) {
      // Create a new peer connection for incoming offer
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      peerConnections.current.set(participantId, peerConnection);

      // Add local stream tracks immediately for incoming offer
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        console.log("Adding local tracks to incoming peer connection for:", participantId, "Track count:", tracks.length);

        tracks.forEach(track => {
          console.log("Adding track to incoming connection:", {
            kind: track.kind,
            enabled: track.enabled,
            participantId: participantId
          });

          // peerConnection is guaranteed to be defined here
          const sender = peerConnection!.addTrack(track, localStreamRef.current!);
          console.log("Track added to incoming connection, sender track:", sender.track?.kind);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind, "from:", participantId);
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteStreams(prev => {
            const newMap = new Map(prev);
            newMap.set(participantId, remoteStream);
            console.log("Added remote stream for participant:", participantId, "Total streams:", newMap.size);
            return newMap;
          });
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log("Sending ICE candidate (answer)");
          socketRef.current.send(JSON.stringify({
            type: "ice-candidate",
            roomId,
            participantId: displayName,
            targetParticipant: participantId,
            payload: event.candidate
          }));
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state changed for ${participantId}:`, peerConnection!.connectionState);
        if (peerConnection!.connectionState === 'connected') {
          console.log(`Successfully connected to ${participantId}`);
        } else if (peerConnection!.connectionState === 'failed') {
          console.error(`Connection failed for ${participantId}`);
        }
      };

      // Handle ICE connection state changes
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state for ${participantId}:`, peerConnection!.iceConnectionState);
      };
    }

    try {
      // Ensure we have a valid offer with SDP content
      if (!offer.sdp || offer.sdp.trim().length === 0) {
        console.error("Received invalid offer - empty SDP");
        return;
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("Set remote description successfully");

      // Process any pending ICE candidates  
      if ((peerConnection as any).pendingCandidates) {
        console.log(`Processing ${(peerConnection as any).pendingCandidates.length} pending ICE candidates`);
        for (const candidate of (peerConnection as any).pendingCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add pending ICE candidate:", err);
          }
        }
        delete (peerConnection as any).pendingCandidates;
      }

      // Add local stream tracks after setting remote description
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getTracks();
        console.log("Available tracks for offer handling:", tracks.length);
        tracks.forEach(track => {
          console.log("Adding track to peer connection:", track.kind, "enabled:", track.enabled, "readyState:", track.readyState);
          try {
            // Check if track is already added
            const existingSenders = peerConnection!.getSenders();
            const trackAlreadyAdded = existingSenders.some(sender => sender.track === track);

            if (!trackAlreadyAdded) {
              const sender = peerConnection!.addTrack(track, localStreamRef.current!);
              console.log("Track added successfully, sender:", !!sender);
            } else {
              console.log("Track already added, skipping");
            }
          } catch (err) {
            console.error("Failed to add track:", err);
          }
        });
      } else {
        console.warn("No local stream available when handling offer from:", participantId);
      }

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log("Sending answer to:", participantId);
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: "answer",
          roomId,
          participantId: displayName,
          targetParticipant: participantId,
          payload: answer
        }));
      }
    } catch (error) {
      console.error("Failed to handle offer:", error, {
        offerType: offer.type,
        offerSdp: offer.sdp ? offer.sdp.substring(0, 100) + "..." : "null"
      });
    }
  };

  const handleAnswer = async (participantId: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) {
      console.warn("No peer connection found for answer from:", participantId);
      return;
    }

    try {
      // Check if we're in the correct state to receive an answer
      if (peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Cannot set remote answer in state: ${peerConnection.signalingState}`);
        // If we're in stable state, the connection might be completed already
        if (peerConnection.signalingState === 'stable' && peerConnection.connectionState === 'connected') {
          console.log("Connection already established for:", participantId);
          return;
        }
        return;
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("Set remote description (answer) successfully for:", participantId);

      // Process any pending ICE candidates
      if ((peerConnection as any).pendingCandidates) {
        console.log(`Processing ${(peerConnection as any).pendingCandidates.length} pending ICE candidates`);
        for (const candidate of (peerConnection as any).pendingCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add pending ICE candidate:", err);
          }
        }
        delete (peerConnection as any).pendingCandidates;
      }
    } catch (error) {
      console.error("Failed to set remote description (answer):", error, {
        signalingState: peerConnection.signalingState,
        answerType: answer.type,
        answerSdp: answer.sdp ? answer.sdp.substring(0, 100) + "..." : "null"
      });
    }
  };

  const handleIceCandidate = async (participantId: string, candidate: RTCIceCandidateInit) => {
    console.log("Handling ICE candidate from:", participantId);
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) {
      console.warn("No peer connection found for ICE candidate from:", participantId);
      return;
    }

    // Skip empty candidates (end-of-candidates marker)
    if (!candidate.candidate) {
      console.log("Received end-of-candidates marker");
      return;
    }

    try {
      // Ensure we have a remote description before adding ICE candidates
      if (peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("Added ICE candidate successfully");
      } else {
        console.warn("Cannot add ICE candidate: no remote description set yet. Signaling state:", peerConnection.signalingState);
        // Queue the candidate to be added later
        if (!(peerConnection as any).pendingCandidates) {
          (peerConnection as any).pendingCandidates = [];
        }
        (peerConnection as any).pendingCandidates.push(candidate);
        console.log("Queued ICE candidate for later");
      }
    } catch (error) {
      console.error("Failed to add ICE candidate:", error);
    }
  };

  const removePeerConnection = (participantId: string) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.current.delete(participantId);
    }
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(participantId);
      return newMap;
    });
  };

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);

        // Notify other participants
        if (socketRef.current) {
          socketRef.current.send(JSON.stringify({
            type: "participant-update",
            roomId,
            participantId: displayName,
            payload: { isMuted: !audioTrack.enabled }
          }));
        }
      }
    }
  }, [roomId, displayName]);

  const toggleVideo = useCallback(async () => {
    try {
      if (!isVideoEnabled) {
        // Turn on video
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        const videoTrack = videoStream.getVideoTracks()[0];

        if (localStreamRef.current) {
          // Remove existing video tracks first
          const existingVideoTracks = localStreamRef.current.getVideoTracks();
          existingVideoTracks.forEach(track => {
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });

          // Add new video track
          localStreamRef.current.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

          // Replace video track in all peer connections
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, localStreamRef.current!);
            }
          });
        }
        setIsVideoEnabled(true);
        console.log("Video enabled");
      } else {
        // Turn off video
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

          // Remove video track from all peer connections
          peerConnections.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(null);
            }
          });
        }
        setIsVideoEnabled(false);
        console.log("Video disabled");
      }

      // Notify other participants
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: "participant-update",
          roomId,
          participantId: displayName,
          payload: { isVideoEnabled: !isVideoEnabled }
        }));
      }
    } catch (error) {
      console.error("Failed to toggle video:", error);
    }
  }, [isVideoEnabled, roomId, displayName]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        screenStreamRef.current = screenStream;

        // When user stops screen share via browser UI, restore camera stream
        screenStream.getVideoTracks()[0].addEventListener('ended', async () => {
          // Stop local screen tracks
          screenStream.getTracks().forEach(t => t.stop());
          screenStreamRef.current = null;
          setIsScreenSharing(false);
          // Re-enable video via camera if originally enabled
          if (isVideoEnabled) {
            try {
              const camStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
              // Update local stream
              if (localStreamRef.current) {
                const audioTrack = localStreamRef.current.getAudioTracks()[0];
                const newStream = new MediaStream();
                if (audioTrack) newStream.addTrack(audioTrack);
                newStream.addTrack(camStream.getVideoTracks()[0]);
                localStreamRef.current = newStream;
                setLocalStream(newStream);
              }
              // Replace video track on all peer connections
              peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) sender.replaceTrack(camStream.getVideoTracks()[0]);
              });
            } catch (err) {
              console.error('Error restoring camera after screen share end:', err);
            }
          }
        }, { once: true });

        // Replace video track in all peer connections and renegotiate
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(async (pc: RTCPeerConnection) => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(videoTrack);
            // Trigger renegotiation
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current?.send(JSON.stringify({
                type: 'offer',
                roomId,
                participantId: displayName,
                payload: offer
              }));
            }
          }
        });

        // Update local stream with screen share
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          const newStream = new MediaStream();
          if (audioTrack) newStream.addTrack(audioTrack);
          newStream.addTrack(videoTrack);

          localStreamRef.current = newStream;
          setLocalStream(newStream);
        }

        setIsScreenSharing(true);
      } else {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
          screenStreamRef.current = null;
        }

        setIsScreenSharing(false);

        // Switch back to camera
        if (isVideoEnabled) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false // Don't request audio again
          });

          const videoTrack = stream.getVideoTracks()[0];

          // Replace video track in all peer connections
          peerConnections.current.forEach((pc: RTCPeerConnection) => {
            const sender = pc.getSenders().find((s: RTCRtpSender) =>
              s.track && s.track.kind === 'video'
            );
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            }
          });

          // Update local stream
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            const newStream = new MediaStream();
            if (audioTrack) newStream.addTrack(audioTrack);
            newStream.addTrack(videoTrack);

            localStreamRef.current = newStream;
            setLocalStream(newStream);
          }
        }
      }
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    }
  }, [isScreenSharing, isVideoEnabled]);

  // Recording functions
  const startRecording = useCallback(() => {
    try {
      if (!localStreamRef.current) {
        console.error("No local stream available for recording");
        return;
      }

      // Create a composite stream with local and remote streams
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;

      const compositeStream = canvas.captureStream(30);

      // Add audio from local stream
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        compositeStream.addTrack(audioTracks[0]);
      }

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : 'video/webm';

      mediaRecorderRef.current = new MediaRecorder(compositeStream, {
        mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      const chunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        setRecordedChunks(chunks);
      };

      // Render composite video
      const renderFrame = () => {
        if (!isRecordingRef.current) return;

        // Clear canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw local video
        const localVideo = document.querySelector('video[data-local="true"]') as HTMLVideoElement;
        if (localVideo && localVideo.videoWidth > 0) {
          const aspectRatio = localVideo.videoWidth / localVideo.videoHeight;
          const width = Math.min(canvas.width / 2, canvas.height * aspectRatio);
          const height = width / aspectRatio;
          ctx.drawImage(localVideo, 10, 10, width, height);
        }

        // Draw remote videos
        const remoteVideos = document.querySelectorAll('video[data-remote="true"]') as NodeListOf<HTMLVideoElement>;
        let x = canvas.width / 2 + 10;
        let y = 10;

        remoteVideos.forEach((video) => {
          if (video.videoWidth > 0) {
            const aspectRatio = video.videoWidth / video.videoHeight;
            const width = Math.min(canvas.width / 2 - 20, canvas.height / 2 * aspectRatio);
            const height = width / aspectRatio;

            ctx.drawImage(video, x, y, width, height);
            y += height + 10;

            if (y + height > canvas.height) {
              x += width + 10;
              y = 10;
            }
          }
        });

        animationFrameIdRef.current = requestAnimationFrame(renderFrame);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
      renderFrame();

      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    }
  }, [isRecording]);

  const downloadRecording = useCallback(() => {
    if (recordedChunks.length === 0) {
      console.error('No recorded chunks available');
      return;
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `meetsonar-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recordedChunks]);

  // チャットメッセージ送信
  const sendChatMessage = useCallback((message: string) => {
    console.log("=== sendChatMessage called ===");
    console.log("Message:", message);
    console.log("Socket state:", socketRef.current?.readyState);
    console.log("Room ID:", roomId);
    console.log("Session ID:", sessionId.current);

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send chat message");
      return;
    }

    const chatData = {
      type: 'chat-message',
      roomId,
      participantId: sessionId.current, // ユニークなセッションIDを使用
      payload: {
        displayName,
        message,
        type: 'text',
      },
    };

    console.log("Sending chat message:", chatData);
    try {
      socketRef.current.send(JSON.stringify(chatData));
      console.log("✅ Chat message sent successfully");
    } catch (error) {
      console.error("❌ Failed to send chat message:", error);
    }
  }, [roomId, displayName]);

  // チャット履歴リクエスト
  const requestChatHistory = useCallback(() => {
    console.log("=== requestChatHistory called ===");
    console.log("Socket state:", socketRef.current?.readyState);
    console.log("Room ID:", roomId);
    
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot request chat history");
      return;
    }

    console.log("Requesting chat history for room:", roomId);
    const historyRequest = {
      type: 'chat-history',
      roomId,
    };
    
    console.log("Sending history request:", historyRequest);
    try {
      socketRef.current.send(JSON.stringify(historyRequest));
      console.log("✅ Chat history request sent successfully");
    } catch (error) {
      console.error("❌ Failed to send chat history request:", error);
    }
  }, [roomId]);

  // 接続時にチャット履歴をリクエスト
  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log("Connection status changed to 'connected', requesting chat history...");
      // 少し遅延してからリクエスト（WebSocket接続が完全に安定してから）
      setTimeout(() => {
        requestChatHistory();
      }, 500);
      
      // さらに1秒後にもう一度リクエスト（確実に取得するため）
      setTimeout(() => {
        requestChatHistory();
      }, 1500);
    }
  }, [connectionStatus, requestChatHistory]);

  const leaveCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }

    // Close all peer connections
    peerConnections.current.forEach((pc: RTCPeerConnection) => pc.close());
    peerConnections.current.clear();

    // Close WebSocket
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "leave-room",
        roomId,
        participantId: displayName,
        payload: {}
      }));
      socketRef.current.close();
    }

    setConnectionStatus("disconnected");
  }, [roomId, displayName]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      leaveCall();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [leaveCall]);

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
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    downloadRecording,
    leaveCall,
  };
}