import { useEffect, useRef } from "react";
import { User, Video as VideoIcon } from "lucide-react";
import type { Participant } from "@shared/schema";

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: Participant[];
  isVideoEnabled: boolean;
  displayName: string;
}

interface VideoStreamProps {
  stream?: MediaStream;
  participant?: Participant;
  isLocal?: boolean;
  isMainSpeaker?: boolean;
  displayName: string;
}

function VideoStream({ stream, participant, isLocal = false, isMainSpeaker = false, displayName }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const name = isLocal ? "You" : (participant?.displayName || displayName);
  const isVideoEnabled = isLocal ? !!stream : (participant?.isVideoEnabled ?? true);
  const isMuted = isLocal ? false : (participant?.isMuted ?? false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative group ${isMainSpeaker ? "md:col-span-2 lg:col-span-2" : ""} ${isLocal ? "border-2 border-primary" : ""}`}>
      <div className="video-container">
        {isVideoEnabled && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-2 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <p className="text-slate-400 text-sm">Camera Off</p>
            </div>
          </div>
        )}

        {/* Video overlay */}
        <div className="video-overlay" />

        {/* Participant info */}
        <div className="absolute bottom-4 left-4 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white font-medium text-lg">{name}</span>
          </div>
          {isMuted && (
            <div className="bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              <i className="fas fa-microphone-slash mr-1" />
              Muted
            </div>
          )}
        </div>

        {/* Video controls overlay */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-2">
            <button className="bg-black/50 backdrop-blur-sm p-2 rounded-lg text-white hover:bg-black/70 transition-colors">
              <i className="fas fa-expand-arrows-alt" />
            </button>
          </div>
        </div>

        {/* Status indicators */}
        {!isVideoEnabled && (
          <div className="absolute top-2 right-2 bg-slate-700/80 p-1 rounded-md">
            <VideoIcon className="w-4 h-4 text-slate-400" />
          </div>
        )}

        {isLocal && (
          <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded-md text-xs text-white">
            You
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoGrid({ localStream, remoteStreams, participants, isVideoEnabled, displayName }: VideoGridProps) {
  // Find the main speaker (first participant who is not muted and has video)
  const mainSpeaker = participants.find(p => !p.isMuted && p.isVideoEnabled) || participants[0];
  const otherParticipants = participants.filter(p => p.connectionId !== mainSpeaker?.connectionId);

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Main speaker video */}
      {mainSpeaker && (
        <VideoStream
          stream={remoteStreams.get(mainSpeaker.connectionId || "")}
          participant={mainSpeaker}
          isMainSpeaker={true}
          displayName={displayName}
        />
      )}

      {/* Other participant videos */}
      {otherParticipants.map((participant) => (
        <VideoStream
          key={participant.connectionId}
          stream={remoteStreams.get(participant.connectionId || "")}
          participant={participant}
          displayName={displayName}
        />
      ))}

      {/* Local video (self) */}
      <VideoStream
        stream={localStream}
        isLocal={true}
        displayName={displayName}
      />
    </div>
  );
}
