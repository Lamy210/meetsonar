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
    console.log("Received signaling message:", message);
    
    switch (message.type) {
      case "participant-joined":
        setParticipants(prev => [...prev, message.payload]);
        // Create peer connection for the new participant
        await createPeerConnection(message.payload.connectionId);
        break;
      
      case "participant-left":
        setParticipants(prev => prev.filter(p => p.connectionId !== message.payload.connectionId));
        removePeerConnection(message.payload.connectionId);
        break;
      
      case "participants-list":
        setParticipants(message.payload);
        // Create peer connections for existing participants
        for (const participant of message.payload) {
          if (participant.connectionId !== displayName) {
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
    }
  };

  const createPeerConnection = async (participantId: string) => {
    if (peerConnections.current.has(participantId)) {
      return; // Connection already exists
    }

    console.log("Creating peer connection for:", participantId);
    
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });

    peerConnections.current.set(participantId, peerConnection);

    // Add local stream to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log("Adding track to peer connection:", track.kind, "enabled:", track.enabled);
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    } else {
      console.warn("No local stream available when creating peer connection for:", participantId);
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind, "from:", participantId);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        setRemoteStreams(prev => new Map(prev.set(participantId, remoteStream)));
        console.log("Added remote stream for participant:", participantId);
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
      } else if (peerConnection.connectionState === 'failed') {
        console.error(`Connection failed for ${participantId}`);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${participantId}:`, peerConnection.iceConnectionState);
    };

    // Create and send offer
    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await peerConnection.setLocalDescription(offer);
      
      console.log("Sending offer to:", participantId);
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
    console.log("Handling offer from:", participantId);
    
    let peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) {
      // Create a new peer connection for incoming offer
      peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });

      peerConnections.current.set(participantId, peerConnection);

      // Add local stream to peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          console.log("Adding track to peer connection:", track.kind);
          peerConnection!.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log("Received remote track:", event.track.kind);
        const [remoteStream] = event.streams;
        setRemoteStreams(prev => new Map(prev.set(participantId, remoteStream)));
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
      await peerConnection.setRemoteDescription(offer);
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
      console.error("Failed to handle offer:", error);
    }
  };

  const handleAnswer = async (participantId: string, answer: RTCSessionDescriptionInit) => {
    const peerConnection = peerConnections.current.get(participantId);
    if (!peerConnection) {
      console.warn("No peer connection found for answer from:", participantId);
      return;
    }

    try {
      await peerConnection.setRemoteDescription(answer);
      console.log("Set remote description (answer) successfully for:", participantId);
    } catch (error) {
      console.error("Failed to set remote description (answer):", error);
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
        console.warn("Cannot add ICE candidate: no remote description set yet");
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
