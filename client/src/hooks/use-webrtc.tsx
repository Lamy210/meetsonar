import { useState, useEffect, useRef, useCallback } from "react";
import type { Participant } from "@shared/schema";

export interface UseWebRTCReturn {
  participants: Participant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionStatus: "connecting" | "connected" | "disconnected" | "failed";
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  leaveCall: () => void;
}

export function useWebRTC(roomId: string, displayName: string): UseWebRTCReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map<string, MediaStream>());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "failed">("connecting");

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef(new Map<string, RTCPeerConnection>());
  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus("connected");
      // Join room
      socket.send(JSON.stringify({
        type: "join-room",
        roomId,
        participantId: displayName,
        payload: { displayName }
      }));
    };

    socket.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      await handleSignalingMessage(message);
    };

    socket.onclose = () => {
      setConnectionStatus("disconnected");
    };

    socket.onerror = () => {
      setConnectionStatus("failed");
    };

    return () => {
      socket.close();
    };
  }, [roomId, displayName]);

  // Initialize local stream
  useEffect(() => {
    const initializeLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false // Start with camera off
        });
        
        localStreamRef.current = stream;
        setLocalStream(stream);
        
        // Set initial audio state
        stream.getAudioTracks().forEach(track => {
          track.enabled = isAudioEnabled;
        });
      } catch (error) {
        console.error("Failed to get user media:", error);
      }
    };

    initializeLocalStream();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSignalingMessage = async (message: any) => {
    switch (message.type) {
      case "participant-joined":
        setParticipants(prev => [...prev, message.payload]);
        await createPeerConnection(message.payload.id);
        break;
      
      case "participant-left":
        setParticipants(prev => prev.filter(p => p.id !== message.payload.id));
        removePeerConnection(message.payload.id);
        break;
      
      case "participants-list":
        setParticipants(message.payload);
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
    }
  };

  const createPeerConnection = async (participantId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });

    peerConnections.current.set(participantId, peerConnection);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(participantId, remoteStream)));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.send(JSON.stringify({
          type: "ice-candidate",
          roomId,
          participantId: displayName,
          payload: event.candidate
        }));
      }
    };

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "offer",
        roomId,
        participantId: displayName,
        payload: offer
      }));
    }
  };

  const handleOffer = async (participantId: string, offer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "answer",
        roomId,
        participantId: displayName,
        payload: answer
      }));
    }
  };

  const handleAnswer = async (participantId: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(answer);
  };

  const handleIceCandidate = async (participantId: string, candidate: RTCIceCandidateInit) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) return;

    await peerConnection.addIceCandidate(candidate);
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
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
          
          // Add video track to all peer connections
          peerConnections.current.forEach(pc => {
            pc.addTrack(videoTrack, localStreamRef.current!);
          });
        }
        setIsVideoEnabled(true);
      } else {
        // Turn off video
        if (localStreamRef.current) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            track.stop();
            localStreamRef.current?.removeTrack(track);
          });
          setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        }
        setIsVideoEnabled(false);
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track in peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        setIsScreenSharing(true);
        
        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (isVideoEnabled) {
            toggleVideo();
          }
        };
      } else {
        // Stop screen sharing
        setIsScreenSharing(false);
        if (isVideoEnabled) {
          toggleVideo();
        }
      }
    } catch (error) {
      console.error("Failed to toggle screen share:", error);
    }
  }, [isScreenSharing, isVideoEnabled, toggleVideo]);

  const leaveCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
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

  return {
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionStatus,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    leaveCall,
  };
}
