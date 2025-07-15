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
          console.log("Audio track initialized:", track.label, track.enabled);
        });
        stream.getVideoTracks().forEach(track => {
          track.enabled = isVideoEnabled;
          console.log("Video track initialized:", track.label, track.enabled);
        });
        
        console.log("Local stream initialized:", {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
          videoTracks: stream.getVideoTracks().length,
          tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
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
        setParticipants(prev => {
          // Avoid duplicate participants
          const exists = prev.some(p => p.connectionId === message.payload.connectionId);
          if (exists) {
            console.warn("Participant already exists:", message.payload.connectionId);
            return prev;
          }
          console.log("Adding new participant:", message.payload.connectionId);
          return [...prev, message.payload];
        });
        // Create peer connection for the new participant (only if it's not us)
        if (message.payload.connectionId !== displayName) {
          await createPeerConnection(message.payload.connectionId);
        }
        break;
      
      case "participant-left":
        setParticipants(prev => prev.filter(p => p.connectionId !== message.payload.connectionId));
        removePeerConnection(message.payload.connectionId);
        break;
      
      case "participants-list":
        console.log("Received participants list:", message.payload.length, "participants");
        setParticipants(message.payload);
        // Create peer connections for existing participants
        for (const participant of message.payload) {
          if (participant.connectionId !== displayName) {
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
    }
  };

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
        
        const sender = peerConnection.addTrack(track, localStreamRef.current!);
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
          
          const sender = peerConnection.addTrack(track, localStreamRef.current!);
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
      if (peerConnection.pendingCandidates) {
        console.log(`Processing ${peerConnection.pendingCandidates.length} pending ICE candidates`);
        for (const candidate of peerConnection.pendingCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add pending ICE candidate:", err);
          }
        }
        delete peerConnection.pendingCandidates;
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
      if (peerConnection.pendingCandidates) {
        console.log(`Processing ${peerConnection.pendingCandidates.length} pending ICE candidates`);
        for (const candidate of peerConnection.pendingCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Failed to add pending ICE candidate:", err);
          }
        }
        delete peerConnection.pendingCandidates;
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
        if (!peerConnection.pendingCandidates) {
          peerConnection.pendingCandidates = [];
        }
        peerConnection.pendingCandidates.push(candidate);
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
