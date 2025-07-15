import { Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import type { Participant } from "@shared/schema";

interface ParticipantItemProps {
  participant: Participant;
  isCurrentUser: boolean;
}

export default function ParticipantItem({ participant, isCurrentUser }: ParticipantItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = () => {
    if (!participant.isMuted) return "bg-green-500";
    return "bg-slate-500";
  };

  const getStatusText = () => {
    if (!participant.isMuted) return "Speaking";
    return "Muted";
  };

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors group ${isCurrentUser ? "bg-primary/10 border border-primary/20" : ""}`}>
      <div className="relative">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-medium">
          {getInitials(participant.displayName)}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} border-2 border-slate-800 rounded-full`} />
      </div>

      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-white">{participant.displayName}</span>
          {participant.isHost && (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
              Host
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
              You
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">{getStatusText()}</p>
      </div>

      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className={`p-1 transition-colors ${participant.isMuted ? "text-red-400" : "text-slate-400 hover:text-white"}`}>
          {participant.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
        </button>
        <button className={`p-1 transition-colors ${participant.isVideoEnabled ? "text-slate-400 hover:text-white" : "text-red-400"}`}>
          {participant.isVideoEnabled ? <VideoIcon className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
