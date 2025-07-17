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
  stream?: MediaStream | null;
  participant?: Participant;
  isLocal?: boolean;
  isMainSpeaker?: boolean;
  isVideoEnabled?: boolean;
  displayName: string;
}

function VideoStream({ stream, participant, isLocal = false, isMainSpeaker = false, displayName }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const name = isLocal ? "You" : (participant?.displayName || displayName);
  const isVideoEnabled = isLocal ? !!stream : (participant?.isVideoEnabled ?? true);
  const isMuted = isLocal ? false : (participant?.isMuted ?? false);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`Setting video source for ${name}:`, {
        streamId: stream.id,
        trackCount: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoTracks: stream.getVideoTracks().length,
        isLocal: isLocal
      });

      videoRef.current.srcObject = stream;

      // Ensure video plays
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Video playing successfully for ${name}`);
        }).catch(error => {
          console.error(`Failed to play video for ${name}:`, error);
        });
      }
    } else if (videoRef.current && !stream) {
      console.log(`No stream available for ${name}`);
      videoRef.current.srcObject = null;
    }
  }, [stream, name]);

  return (
    <div className={`relative group ${isMainSpeaker ? "md:col-span-2 lg:col-span-2" : ""} ${isLocal ? "border-2 border-primary" : ""}`}>
      <div className="video-container">
        {isVideoEnabled && stream ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            controls={false}
            className="w-full h-full object-cover bg-gray-900"
            data-local={isLocal ? "true" : "false"}
            data-remote={!isLocal ? "true" : "false"}
            onLoadedMetadata={() => {
              console.log(`Video metadata loaded for ${name}`);
            }}
            onPlay={() => {
              console.log(`Video started playing for ${name}`);
            }}
            onError={(e) => {
              console.error(`Video error for ${name}:`, e);
            }}
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
            あなた
          </div>
        )}
      </div>
    </div>
  );
}

export default function VideoGrid({ localStream, remoteStreams, participants, isVideoEnabled, displayName }: VideoGridProps) {
  // Debug logging
  console.log("VideoGrid render:", {
    localStreamTracks: localStream?.getTracks().length || 0,
    remoteStreamsCount: remoteStreams.size,
    remoteStreamKeys: Array.from(remoteStreams.keys()),
    participantsCount: participants.length,
    participantIds: participants.map(p => p.connectionId)
  });



  // Filter out self from participants list
  const remoteParticipants = participants.filter(p => p.connectionId !== displayName);
  const totalParticipants = remoteParticipants.length + 1; // +1 for local user

  // Determine grid layout based on participant count
  const getGridClass = () => {
    switch (totalParticipants) {
      case 1:
        return "grid grid-cols-1 place-items-center";
      case 2:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
      case 3:
      case 4:
        return "grid grid-cols-1 md:grid-cols-2 gap-4";
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
    }
  };

  return (
    <div className="flex-1 p-6">
      <div className={`${getGridClass()} h-full`}>
        {/* Local video stream */}
        <VideoStream
          stream={localStream}
          isLocal={true}
          isVideoEnabled={isVideoEnabled}
          displayName="あなた"
        />

        {/* Remote video streams */}
        {remoteParticipants.map((participant) => {
          // connectionId is non-null after filtering
          const stream = remoteStreams.get(participant.connectionId!);
          return (
            <VideoStream
              key={participant.connectionId}
              stream={stream}
              participant={participant}
              isLocal={false}
              isMainSpeaker={false}
              isVideoEnabled={participant.isVideoEnabled}
              displayName={participant.displayName}
            />
          );
        })}
      </div>
    </div>
  );
}
