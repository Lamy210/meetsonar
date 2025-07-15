export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export class WebRTCManager {
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private config: WebRTCConfig;

  constructor(config: WebRTCConfig = defaultWebRTCConfig) {
    this.config = config;
  }

  async initializeLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error("Failed to get user media:", error);
      throw error;
    }
  }

  createPeerConnection(participantId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(this.config);
    this.peerConnections.set(participantId, peerConnection);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    return peerConnection;
  }

  getPeerConnection(participantId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(participantId);
  }

  removePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
  }

  async createOffer(participantId: string): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.getPeerConnection(participantId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for participant: ${participantId}`);
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(participantId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const peerConnection = this.getPeerConnection(participantId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for participant: ${participantId}`);
    }

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(participantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.getPeerConnection(participantId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for participant: ${participantId}`);
    }

    await peerConnection.setRemoteDescription(answer);
  }

  async addIceCandidate(participantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const peerConnection = this.getPeerConnection(participantId);
    if (!peerConnection) {
      throw new Error(`No peer connection found for participant: ${participantId}`);
    }

    await peerConnection.addIceCandidate(candidate);
  }

  toggleAudioTrack(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideoTrack(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  async startScreenShare(): Promise<MediaStream> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      this.peerConnections.forEach(peerConnection => {
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      return screenStream;
    } catch (error) {
      console.error("Failed to start screen share:", error);
      throw error;
    }
  }

  cleanup(): void {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(peerConnection => {
      peerConnection.close();
    });
    this.peerConnections.clear();
  }
}
