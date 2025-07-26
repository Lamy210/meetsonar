import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import VideoGrid from "@/components/video-grid";
import CallControls from "@/components/call-controls";
import ParticipantItem from "@/components/participant-item";
import SettingsModal from "@/components/settings-modal";
import InviteModal from "@/components/invite-modal";
import { useWebRTC } from "@/hooks/use-webrtc";
import { Button } from "@/components/ui/minimal-button";
import { Video, Users, MessageSquare, Copy, UserPlus, RotateCcw } from "lucide-react";
import TabChat from "@/components/tab-chat";

export default function Call() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();

  // roomIdが存在しない場合は早期リターン
  if (!roomId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">Room not found</h1>
          <p className="text-slate-400">Invalid room ID provided.</p>
        </div>
      </div>
    );
  }
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("HD");
  const [callDuration, setCallDuration] = useState("00:00");
  const [currentTab, setCurrentTab] = useState("participants");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastChatCount, setLastChatCount] = useState(0);

  // URLパラメータから表示名と招待情報を取得
  const urlParams = new URLSearchParams(window.location.search);
  const nameFromUrl = urlParams.get("displayName") || urlParams.get("name");
  const invitedBy = urlParams.get("invitedBy") || urlParams.get("inviter");
  const inviteeEmail = urlParams.get("email");

  console.log("URL params:", Object.fromEntries(urlParams.entries()));
  console.log("Name from URL:", nameFromUrl);
  console.log("Invited by:", invitedBy);
  console.log("Invitee email:", inviteeEmail);

  if (nameFromUrl) {
    localStorage.setItem("displayName", nameFromUrl);
  }
  const displayName = localStorage.getItem("displayName") || `User-${Math.random().toString(36).substr(2, 5)}`;

  // 招待情報をlocalStorageに保存（チャットなどで使用）
  if (invitedBy) {
    localStorage.setItem("invitedBy", invitedBy);
  }
  if (inviteeEmail) {
    localStorage.setItem("inviteeEmail", inviteeEmail);
  }

  console.log("Final displayName:", displayName);

  // ユーザー識別用の安定したIDを生成・保存
  const getUserStableId = () => {
    let stableId = localStorage.getItem("userStableId");
    if (!stableId) {
      stableId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("userStableId", stableId);
    }
    return stableId;
  };
  const userStableId = getUserStableId();
  console.log("User stable ID:", userStableId);

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
    refreshMediaSettings,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    startRecording,
    stopRecording,
    downloadRecording,
    leaveCall,
  } = useWebRTC(roomId!, displayName);

  console.log("Call page - roomId from URL:", roomId);
  console.log("Call page - displayName:", displayName);
  console.log("Call page - connectionStatus:", connectionStatus);
  console.log("Call page - participantId:", participantId);

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

  // 招待経由での参加の場合、ウェルカムメッセージを送信
  useEffect(() => {
    if (connectionStatus === 'connected' && invitedBy && sendChatMessage) {
      const welcomeMessage = `${displayName}さんが${invitedBy}さんの招待で参加しました 🎉`;
      setTimeout(() => {
        sendChatMessage(welcomeMessage);
      }, 2000); // 2秒後に送信
    }
  }, [connectionStatus, invitedBy, displayName, sendChatMessage]);

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
    <div className="full-height bg-slate-900 text-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 px-6 py-4 flex items-center justify-between flex-shrink-0">
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
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 p-3 sm:p-6 min-w-0 min-h-0">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            isVideoEnabled={isVideoEnabled}
            displayName={displayName}
            participantId={participantId}
          />
        </div>

        {/* Sidebar - 小さい画面でも表示されるように調整 */}
        <div className="w-72 sm:w-80 md:w-80 lg:w-80 min-w-[280px] max-w-[320px] bg-slate-800/50 backdrop-blur-md border-l border-slate-700/50 flex flex-col min-h-0 flex-shrink-0">{/* Custom Tab Implementation - Fixed Height Container */}
          <div className="w-full h-full flex flex-col min-h-0">
            {/* Tab Header */}
            <div className="p-3 sm:p-4 border-b border-slate-700/50 flex-shrink-0 bg-slate-900/50">
              <div className="grid w-full grid-cols-2 bg-slate-800 rounded-lg p-1 gap-1">
                <button
                  onClick={() => {
                    console.log("Participants tab clicked");
                    setCurrentTab("participants");
                  }}
                  className={`text-xs sm:text-sm font-medium transition-all duration-200 py-2 px-2 sm:px-4 rounded-md z-10 relative ${currentTab === "participants"
                    ? "bg-slate-700 text-white shadow-md"
                    : "bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  data-testid="participant-tab"
                  style={{ minHeight: '36px' }}
                >
                  <Users className="w-4 h-4 mr-1 sm:mr-2 inline" />
                  <span className="hidden sm:inline">Participants</span>
                  <span className="sm:hidden">参加者</span>
                  <span className="ml-1">({participants.length})</span>
                </button>
                <button
                  onClick={() => {
                    console.log("Chat tab clicked");
                    setCurrentTab("chat");
                  }}
                  className={`text-xs sm:text-sm font-medium relative transition-all duration-200 py-2 px-2 sm:px-4 rounded-md z-10 ${currentTab === "chat"
                    ? "bg-slate-700 text-white shadow-md"
                    : "bg-transparent text-slate-300 hover:text-white hover:bg-slate-700/50"
                    }`}
                  data-testid="chat-tab"
                  style={{ minHeight: '36px' }}
                >
                  <MessageSquare className="w-4 h-4 mr-1 sm:mr-2 inline" />
                  <span className="hidden sm:inline">Chat</span>
                  <span className="sm:hidden">チャット</span>
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse z-20">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Fixed Content Container */}
            <div className="flex-1 overflow-hidden relative z-0">
              {/* Participants Panel */}
              <div
                className={`absolute inset-0 flex flex-col transition-opacity duration-200 z-10 ${currentTab === "participants" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  }`}
                data-testid="participant-list"
              >
                {/* 参加者リストヘッダー */}
                <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/30 flex-shrink-0">
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
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">参加者を待っています...</p>
                      </div>
                    ) : (
                      participants.map((participant) => (
                        <ParticipantItem
                          key={participant.connectionId}
                          participant={participant}
                          isCurrentUser={participant.connectionId === participantId}
                          isLocal={participant.connectionId === participantId}
                          remoteStream={participant.connectionId ? remoteStreams.get(participant.connectionId) : undefined}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Panel */}
              <div
                className={`absolute inset-0 transition-opacity duration-200 z-10 ${currentTab === "chat" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  }`}
              >
                <TabChat
                  roomId={roomId}
                  participantId={participantId}
                  displayName={displayName}
                  userStableId={userStableId}
                  connectionStatus={connectionStatus}
                  sendMessage={sendChatMessage}
                  chatMessages={chatMessages}
                  requestChatHistory={requestChatHistory}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex-shrink-0 bg-slate-900/50 border-t border-slate-700/50">
        <div className="p-4 sm:p-6">
          <CallControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            isRecording={isRecording}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onLeaveCall={handleLeaveCall}
            onDownloadRecording={downloadRecording}
            recordedChunks={recordedChunks}
            onOpenSettings={() => setShowSettings(true)}
            onOpenInvite={() => setShowInvite(true)}
            connectionQuality={connectionQuality}
          />
        </div>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={refreshMediaSettings}
      />

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        roomId={roomId}
        displayName={displayName}
      />
    </div>
  );
}
