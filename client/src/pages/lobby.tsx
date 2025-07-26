import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/minimal-card";
import { Video, Users, Plus } from "lucide-react";

export default function Lobby() {
  const [, setLocation] = useLocation();
  const [roomId, setRoomId] = useState("");
  const [displayName, setDisplayName] = useState("");

  const generateRoomId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `room-${timestamp}-${random}`;
  };

  const createRoom = () => {
    if (!displayName.trim()) return;
    const newRoomId = generateRoomId();
    localStorage.setItem("displayName", displayName);
    setLocation(`/room/${newRoomId}`);
  };

  const joinRoom = () => {
    if (!roomId.trim() || !displayName.trim()) return;
    localStorage.setItem("displayName", displayName);
    setLocation(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 py-8 px-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">VideoCall Pro</h1>
          <p className="text-slate-400 text-lg">Professional video conferencing platform</p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Plus className="w-5 h-5" />
                Start New Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Your Display Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-primary focus:border-primary"
                />
              </div>
              <Button
                onClick={createRoom}
                disabled={!displayName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                Create Room
              </Button>
              <p className="text-xs text-slate-400">
                Start an instant meeting with a unique room ID
              </p>
            </CardContent>
          </Card>

          {/* Join Room */}
          <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5" />
                Join Meeting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Your Display Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Room ID</label>
                <Input
                  type="text"
                  placeholder="Enter room ID"
                  value={roomId}
                  onChange={(e) => setRoomId((e.target as HTMLInputElement).value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:ring-primary focus:border-primary"
                />
              </div>
              <Button
                onClick={joinRoom}
                disabled={!roomId.trim() || !displayName.trim()}
                className="w-full bg-primary hover:bg-primary/90 text-white"
              >
                Join Room
              </Button>
              <p className="text-xs text-slate-400">
                Join an existing meeting using the room ID
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-2">HD Video Quality</h3>
            <p className="text-sm text-slate-400">Crystal clear video calls with adaptive quality</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-2">Multi-participant</h3>
            <p className="text-sm text-slate-400">Support for up to 10 participants per room</p>
          </div>
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-white mb-2">Easy to Use</h3>
            <p className="text-sm text-slate-400">No downloads required, works in your browser</p>
          </div>
        </div>

        {/* URL Invitation Demo */}
        <div className="mt-12 mb-8">
          <Card className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-md border-2 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-primary">🔗 URL招待機能をテスト</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400 mb-4">
                URL招待機能をテストするためのサンプルリンクを生成できます
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  onClick={() => {
                    const testRoomId = generateRoomId();
                    const urlInvite = `${window.location.origin}/join/${testRoomId}?inviter=テスト招待者&name=ゲストユーザー&email=guest@example.com`;
                    navigator.clipboard.writeText(urlInvite);
                    alert('テスト用URL招待リンクをクリップボードにコピーしました！\n\n' + urlInvite);
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  サンプルURL招待を生成
                </Button>

                <Button
                  onClick={() => {
                    const testRoomId = "demo-room-" + Date.now().toString(36);
                    setLocation(`/join/${testRoomId}?inviter=デモ招待者&name=${encodeURIComponent(displayName || 'テストユーザー')}&expires=${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}`);
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Video className="w-4 h-4 mr-2" />
                  URL招待ページをテスト
                </Button>
              </div>

              <div className="text-xs text-slate-500 mt-2">
                <p><strong>サンプルパラメータ:</strong></p>
                <p>• 招待者: テスト招待者 / デモ招待者</p>
                <p>• 事前設定名: ゲストユーザー / 入力した表示名</p>
                <p>• 有効期限: 24時間後</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom spacing for better scrolling */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
}
