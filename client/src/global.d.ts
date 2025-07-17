// Global type declarations

// React Query module declarations
declare module '@tanstack/react-query' {
  // Basic exports as any to silence missing types
  export const QueryClientProvider: any;
  export const QueryClient: any;
  export type QueryFunctionContext = { queryKey: unknown[] };
}
declare module '@tanstack/react-query/build/legacy/index.cjs' {
  import pkg from '@tanstack/react-query';
  export = pkg;
}

// Extend RTCPeerConnection to include pendingCandidates
declare global {
  interface RTCPeerConnection {
    pendingCandidates?: RTCIceCandidateInit[];
  }
}
