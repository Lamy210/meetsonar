import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import VideoGrid from "@/components/video-grid";
import CallControls from "@/components/call-controls";
import ParticipantItem from "@/components/participant-item";
import SettingsModal from "@/components/settings-modal";
import InviteModal from "@/components/invite-modal";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, MessageSquare, Copy, UserPlus, RotateCcw } from "lucide-react";

export default function Call() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("HD");
  const [callDuration, setCallDuration] = useState("00:00");

  const displayName = localStorage.getItem("displayName") || "Anonymous";

  const {
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    isRecording,
    recordedChunks,
    connectionStatus,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    downloadRecording,
    leaveCall,
  } = useWebRTC(roomId!, displayName);

  const { isConnected, sendMessage } = useWebSocket("/ws", roomId!);

  useEffect(() => {
    if (!roomId) {
      setLocation("/");
      return;
    }

    // Start call duration timer
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setCallDuration(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [roomId, setLocation]);

  const handleLeaveCall = () => {
    leaveCall();
    setLocation("/");
  };

  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RotateCcw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Connecting to call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-semibold">VideoCall Pro</h1>
          <div className="hidden md:flex items-center space-x-2 text-sm text-slate-400">
            <span>Room:</span>
            <span className="text-slate-200 font-medium">{roomId}</span>
            <button
              onClick={copyRoomLink}
              className="text-primary hover:text-primary/80 transition-colors p-1"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Quality */}
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-slate-400">{connectionQuality} Quality</span>
            <div className="flex space-x-1">
              <div className="w-1 h-3 bg-green-500 rounded-sm" />
              <div className="w-1 h-4 bg-green-500 rounded-sm" />
              <div className="w-1 h-2 bg-green-500 rounded-sm" />
            </div>
          </div>

          {/* Call Duration */}
          <div className="text-slate-400 text-sm font-medium">
            {callDuration}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-6">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            isVideoEnabled={isVideoEnabled}
            displayName={displayName}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-md border-l border-slate-700/50 flex flex-col">
          <div className="border-b border-slate-700/50 p-4">
            <Tabs defaultValue="participants" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="participants" className="text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-sm">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="mt-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {participants.map((participant) => (
                    <ParticipantItem
                      key={participant.id}
                      participant={participant}
                      isCurrentUser={participant.displayName === displayName}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="chat" className="mt-4">
                <div className="text-center text-slate-400 py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chat feature coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-slate-700/50 p-4 mt-auto">
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowInvite(true)}
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Invite
              </Button>
              <Button variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">
                <RotateCcw className="w-4 h-4 mr-2" />
                Record
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <CallControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        recordedChunks={recordedChunks}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onDownloadRecording={downloadRecording}
        onOpenSettings={() => setShowSettings(true)}
        onLeaveCall={handleLeaveCall}
        connectionQuality={connectionQuality}
      />

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        roomId={roomId!}
      />
    </div>
  );
}
