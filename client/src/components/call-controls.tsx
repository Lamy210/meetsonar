import { Mic, MicOff, Video, VideoOff, Monitor, Settings, Phone, MoreVertical, Circle, Square, Download, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/minimal-button";

interface CallControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isRecording: boolean;
  recordedChunks: Blob[];
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  onOpenSettings: () => void;
  onOpenInvite: () => void;
  onLeaveCall: () => void;
  connectionQuality: string;
}

export default function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isRecording,
  recordedChunks,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  onOpenSettings,
  onOpenInvite,
  onLeaveCall,
  connectionQuality,
}: CallControlsProps) {
  return (
    <div className="bg-slate-800/80 backdrop-blur-md border-t border-slate-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Controls - Device Selection */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <select className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>Default Microphone</option>
              <option>USB Headset</option>
              <option>Built-in Microphone</option>
            </select>
            <select className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-primary focus:border-transparent">
              <option>Default Camera</option>
              <option>External Webcam</option>
              <option>Virtual Camera</option>
            </select>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex items-center space-x-4">
          {/* Microphone Toggle */}
          <Button
            onClick={onToggleAudio}
            className={`control-button ${isAudioEnabled ? "active" : "inactive"}`}
            size="icon"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          {/* Camera Toggle */}
          <Button
            onClick={onToggleVideo}
            className={`control-button ${isVideoEnabled ? "active" : "inactive"}`}
            size="icon"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Screen Share */}
          <Button
            onClick={onToggleScreenShare}
            className={`control-button ${isScreenSharing ? "active" : "neutral"}`}
            size="icon"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {/* Recording Controls */}
          {!isRecording ? (
            <Button
              onClick={onStartRecording}
              className="control-button neutral"
              size="icon"
              title="録画開始"
            >
              <Circle className="w-5 h-5" />
            </Button>
          ) : (
            <Button
              onClick={onStopRecording}
              className="control-button recording"
              size="icon"
              title="録画停止"
            >
              <Square className="w-5 h-5 fill-current" />
            </Button>
          )}

          {/* Download Recording */}
          {recordedChunks.length > 0 && (
            <Button
              onClick={onDownloadRecording}
              className="control-button neutral"
              size="icon"
              title="録画をダウンロード"
            >
              <Download className="w-5 h-5" />
            </Button>
          )}

          {/* Invite Participants */}
          <Button
            onClick={onOpenInvite}
            className="control-button neutral"
            size="icon"
            title="参加者を招待"
          >
            <UserPlus className="w-5 h-5" />
          </Button>

          {/* Settings */}
          <Button
            onClick={onOpenSettings}
            className="control-button neutral"
            size="icon"
            title="設定"
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* Leave Call */}
          <Button
            onClick={onLeaveCall}
            className="control-button inactive"
            size="icon"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
          </Button>
        </div>

        {/* Right Controls - Status Info */}
        <div className="flex items-center space-x-4">
          {/* Call Quality Info */}
          <div className="text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <span>Quality:</span>
              <span className="text-green-400 font-medium">{connectionQuality}</span>
              <span>•</span>
              <span>45ms</span>
            </div>
          </div>

          {/* More Options */}
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-white"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
