import { Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react";
import type { Participant } from "@shared/schema-sqlite";

interface ParticipantItemProps {
  participant: Participant;
  isCurrentUser: boolean;
  isLocal?: boolean;
  remoteStream?: MediaStream;
}

export default function ParticipantItem({ participant, isCurrentUser, isLocal, remoteStream }: ParticipantItemProps) {
  const getInitials = (name: string | undefined) => {
    if (!name) return "??";
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
    <div className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700/50 transition-colors group relative ${isCurrentUser ? "bg-blue-500/10 border border-blue-500/30" : "bg-slate-800/50"}`}>
      <div className="relative">
        {/* アバター */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
          {getInitials(participant.displayName)}
        </div>
        {/* オンライン状態インジケーター */}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor()} border-2 border-slate-800 rounded-full shadow-md`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-semibold text-white truncate">{participant.displayName || "Unknown User"}</span>
          {participant.isHost && (
            <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-medium">
              🎯 Host
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium">
              👤 You
            </span>
          )}
        </div>
        
        {/* 参加時間の表示 */}
        <div className="flex items-center space-x-2">
          <p className="text-xs text-slate-400">{getStatusText()}</p>
          {participant.joinedAt && (
            <span className="text-xs text-slate-500">
              • 参加: {new Date(participant.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 音声・ビデオ状態 */}
      <div className="flex flex-col space-y-1">
        <div className="flex space-x-1">
          <div className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${participant.isMuted ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
            {participant.isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </div>
          <div className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${participant.isVideoEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {participant.isVideoEnabled ? <VideoIcon className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}
