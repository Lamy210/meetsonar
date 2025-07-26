// Global type declarations

// SWR types (lightweight alternative to React Query)
declare module 'swr' {
  // Custom SWR configuration types can be added here if needed
}

// Extend RTCPeerConnection to include pendingCandidates
declare global {
  interface RTCPeerConnection {
    pendingCandidates?: RTCIceCandidateInit[];
  }
}
