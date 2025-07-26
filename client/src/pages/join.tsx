import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { Label } from "@/components/ui/minimal-label";
import { CheckCircle, Users, Video, User, Calendar, Clock } from "lucide-react";

interface RoomInfo {
  id: string;
  name: string;
  maxParticipants: number;
  isActive: boolean;
  hostId?: number;
  createdAt: string;
}

export default function JoinPage() {
  const { roomId } = useParams();
  const [, setLocation] = useLocation();

  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);

  // URLパラメータから招待情報を取得
  const urlParams = new URLSearchParams(window.location.search);
  const inviterName = urlParams.get("inviter") || urlParams.get("from");
  const inviteeEmail = urlParams.get("email");
  const suggestedName = urlParams.get("name") || urlParams.get("displayName");
  const message = urlParams.get("message");
  const expiry = urlParams.get("expires");

  useEffect(() => {
    if (!roomId) {
      setError("ルームIDが指定されていません");
      setLoading(false);
      return;
    }

    // URLパラメータから表示名を事前設定
    if (suggestedName) {
      setDisplayName(suggestedName);
    } else if (inviteeEmail) {
      // メールアドレスから名前を推測
      const nameFromEmail = inviteeEmail.split("@")[0];
      setDisplayName(nameFromEmail);
    }

    fetchRoomInfo();
  }, [roomId, suggestedName, inviteeEmail]);

  const fetchRoomInfo = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("ルームが見つかりません");
        } else {
          throw new Error("ルーム情報の取得に失敗しました");
        }
      }

      const data = await response.json();
      setRoomInfo(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : "ルーム情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!displayName.trim()) {
      alert("表示名を入力してください");
      return;
    }

    setJoining(true);

    try {
      // ルームに参加
      const joinUrl = `/room/${roomId}?displayName=${encodeURIComponent(displayName.trim())}`;

      // 招待者情報があれば追加
      if (inviterName) {
        const finalUrl = `${joinUrl}&invitedBy=${encodeURIComponent(inviterName)}`;
        setLocation(finalUrl);
      } else {
        setLocation(joinUrl);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "ルームへの参加に失敗しました");
      setJoining(false);
    }
  };

  const isExpired = expiry && new Date() > new Date(expiry);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-400">ルーム情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !roomInfo) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Video className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">ルームが見つかりません</h1>
          <p className="text-slate-400">{error || "指定されたルームは存在しないか、既に終了しています。"}</p>
          <Button
            onClick={() => setLocation('/')}
            className="bg-primary hover:bg-primary/90"
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Clock className="w-12 h-12 text-orange-500 mx-auto" />
          <h1 className="text-2xl font-bold">招待の期限が切れています</h1>
          <p className="text-slate-400">
            この招待は {new Date(expiry!).toLocaleDateString()} {new Date(expiry!).toLocaleTimeString()} に期限切れになりました。
          </p>
          <Button
            onClick={() => setLocation('/')}
            className="bg-primary hover:bg-primary/90"
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              {inviterName ? "ミーティング招待" : "ミーティングに参加"}
            </h1>
            <p className="text-slate-400">
              {inviterName
                ? `${inviterName}さんからの招待です`
                : "ビデオ通話に参加しましょう"
              }
            </p>
          </div>

          {/* Room Information */}
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Video className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">ミーティング名</p>
                  <p className="font-medium">{roomInfo.name}</p>
                </div>
              </div>

              {inviterName && (
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">招待者</p>
                    <p className="font-medium">{inviterName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">最大参加者数</p>
                  <p className="font-medium">{roomInfo.maxParticipants}人</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">作成日時</p>
                  <p className="font-medium">
                    {new Date(roomInfo.createdAt).toLocaleDateString()} {new Date(roomInfo.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {expiry && !isExpired && (
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-400">招待有効期限</p>
                    <p className="font-medium">
                      {new Date(expiry).toLocaleDateString()} {new Date(expiry).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Message */}
            {message && (
              <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-slate-300">
                  <span className="text-slate-400">メッセージ:</span> {message}
                </p>
              </div>
            )}
          </div>

          {/* Display Name Input */}
          <div className="mb-6">
            <Label className="block text-sm text-slate-400 mb-2">表示名</Label>
            <Input
              type="text"
              placeholder="ミーティングで表示される名前を入力"
              value={displayName}
              onChange={(e) => setDisplayName((e.target as HTMLInputElement).value)}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
            <p className="text-xs text-slate-500 mt-1">
              他の参加者に表示される名前です
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={joinRoom}
              disabled={!displayName.trim() || joining}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {joining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  参加中...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  ミーティングに参加
                </>
              )}
            </Button>

            <Button
              onClick={() => setLocation('/')}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              ホームに戻る
            </Button>
          </div>

          {/* URL Parameters Info (Debug) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-300 mb-2">URL パラメータ (開発用)</h3>
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong>Room ID:</strong> {roomId}</p>
                <p><strong>Inviter:</strong> {inviterName || "N/A"}</p>
                <p><strong>Email:</strong> {inviteeEmail || "N/A"}</p>
                <p><strong>Suggested Name:</strong> {suggestedName || "N/A"}</p>
                <p><strong>Message:</strong> {message || "N/A"}</p>
                <p><strong>Expires:</strong> {expiry || "N/A"}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-xs text-slate-500">
              MeetSonar - 安全で高品質なビデオ通話
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
