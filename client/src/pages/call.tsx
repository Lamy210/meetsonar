import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import VideoGrid from "@/components/video-grid";
import CallControls from "@/components/call-controls";
import ParticipantItem from "@/components/participant-item";
import SettingsModal from "@/components/settings-modal";
import InviteModal from "@/components/invite-modal";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Users, MessageSquare, Copy, UserPlus, RotateCcw } from "lucide-react";
import TabChat from "@/components/tab-chat";

export default function Call() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("HD");
  const [callDuration, setCallDuration] = useState("00:00");
  const [currentTab, setCurrentTab] = useState("participants");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastChatCount, setLastChatCount] = useState(0);

  // URLパラメータから表示名を取得、またはlocalStorageを使用
  const urlParams = new URLSearchParams(window.location.search);
  const nameFromUrl = urlParams.get("name");
  if (nameFromUrl) {
    localStorage.setItem("displayName", nameFromUrl);
  }
  const displayName = localStorage.getItem("displayName") || `User-${Math.random().toString(36).substr(2, 5)}`;

  console.log("Call page - roomId from URL:", roomId);
  console.log("Call page - displayName:", displayName);
  console.log("Call page - connectionStatus:", connectionStatus);
  console.log("Call page - participantId:", participantId);

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
    chatMessages,
    participantId,
    sendChatMessage,
    requestChatHistory,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    downloadRecording,
    leaveCall,
  } = useWebRTC(roomId!, displayName);

  // const { isConnected } = useWebSocket("/ws", roomId!); // 重複削除

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

  // チャット未読カウント管理
  useEffect(() => {
    console.log("=== Chat Debug ===", {
      currentTab,
      chatMessagesLength: chatMessages.length,
      lastChatCount,
      unreadChatCount,
      connectionStatus,
      participantId
    });
    
    if (currentTab === "chat") {
      setUnreadChatCount(0);
      setLastChatCount(chatMessages.length);
    } else if (chatMessages.length > lastChatCount) {
      setUnreadChatCount(chatMessages.length - lastChatCount);
    }
  }, [chatMessages.length, currentTab, lastChatCount]);

  // タブ切り替えのデバッグ
  useEffect(() => {
    console.log("=== Tab Changed ===", currentTab);
  }, [currentTab]);

  const handleLeaveCall = useCallback(() => {
    leaveCall();
    setLocation("/");
  }, [leaveCall, setLocation]);

  const copyRoomLink = useCallback(() => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
  }, [roomId]);

  if (connectionStatus !== 'connected') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <RotateCcw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-400">Connecting to call...</p>
          <div className="text-xs text-slate-500 space-y-1">
            <p>Room ID: {roomId}</p>
            <p>Display Name: {displayName}</p>
            <p>Connection Status: {connectionStatus}</p>
            <p>Participant ID: {participantId || 'Not assigned'}</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Reload Page
          </button>
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
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Video Area */}
        <div className="flex-1 p-6 min-w-0">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            isVideoEnabled={isVideoEnabled}
            displayName={displayName}
            participantId={participantId}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800/50 backdrop-blur-md border-l border-slate-700/50 flex flex-col min-h-0 max-h-full">
          <Tabs defaultValue="participants" value={currentTab} onValueChange={setCurrentTab} className="w-full h-full flex flex-col min-h-0">
            <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="participants" className="text-sm">
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-sm relative">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>            <TabsContent value="participants" className="flex-1 flex flex-col mt-0 overflow-hidden">
              {/* 参加者リストヘッダー */}
              <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">参加者一覧</h3>
                    <p className="text-xs text-slate-400">{participants.length}人が参加中</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400">Live</span>
                  </div>
                </div>
              </div>

              {/* 参加者リスト */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-2">
                  {participants.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">参加者を待っています...</p>
                      <p className="text-xs mt-1">ルームリンクを共有して他の人を招待しましょう</p>
                    </div>
                  ) : (
                    participants.map((participant, index) => (
                      <ParticipantItem
                        key={participant.id || participant.connectionId || `participant-${index}`}
                        participant={participant}
                        isCurrentUser={participant.connectionId === participantId}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col mt-0 overflow-hidden">
              <TabChat
                roomId={roomId!}
                participantId={participantId} // ユニークなセッションIDを使用
                displayName={displayName}
                connectionStatus={connectionStatus}
                sendMessage={sendChatMessage}
                chatMessages={chatMessages}
                requestChatHistory={requestChatHistory}
              />
            </TabsContent>

            {/* Quick Actions */}
            <div className="border-t border-slate-700/50 p-4 flex-shrink-0">
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
          </Tabs>
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
