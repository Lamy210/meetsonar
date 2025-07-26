import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { Label } from "@/components/ui/minimal-label";
import { CheckCircle, Clock, AlertCircle, User, Video } from "lucide-react";

interface InvitationData {
  invitation: {
    id: number;
    roomId: string;
    roomName: string;
    inviterDisplayName: string;
    inviteeEmail: string;
    createdAt: string;
    expiresAt: string;
  };
  room: {
    id: string;
    name: string;
    maxParticipants: number;
  };
}

export default function InvitePage() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load invitation');
      }

      const data = await response.json();
      setInvitation(data);
      
      // Pre-fill display name if available
      if (data.invitation.inviteeDisplayName) {
        setDisplayName(data.invitation.inviteeDisplayName);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (action: 'accept' | 'decline') => {
    if (action === 'accept' && !displayName.trim()) {
      alert('表示名を入力してください');
      return;
    }

    setResponding(true);
    try {
      const response = await fetch(`/api/invitations/${token}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteToken: token,
          action,
          displayName: displayName.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to respond to invitation');
      }

      const data = await response.json();
      
      if (action === 'accept' && data.joinLink) {
        // Redirect to the meeting room
        window.location.href = data.joinLink;
      } else {
        // Show success message for decline
        alert(data.message);
        setLocation('/');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to respond to invitation');
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-400">招待情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">招待が見つかりません</h1>
          <p className="text-slate-400">{error || "招待リンクが無効か期限切れです。"}</p>
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

  const expiresAt = new Date(invitation.invitation.expiresAt);
  const isExpired = new Date() > expiresAt;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Clock className="w-12 h-12 text-orange-500 mx-auto" />
          <h1 className="text-2xl font-bold">招待の期限が切れています</h1>
          <p className="text-slate-400">
            この招待は {expiresAt.toLocaleDateString()} {expiresAt.toLocaleTimeString()} に期限切れになりました。
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
            <h1 className="text-2xl font-bold mb-2">ミーティング招待</h1>
            <p className="text-slate-400">ビデオ通話への招待が届いています</p>
          </div>

          {/* Invitation Details */}
          <div className="bg-slate-800 rounded-lg p-6 mb-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">招待者</p>
                  <p className="font-medium">{invitation.invitation.inviterDisplayName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Video className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">ミーティング名</p>
                  <p className="font-medium">{invitation.room.name}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm text-slate-400">有効期限</p>
                  <p className="font-medium">
                    {expiresAt.toLocaleDateString()} {expiresAt.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
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
              onClick={() => respondToInvitation('accept')}
              disabled={!displayName.trim() || responding}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {responding ? (
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
              onClick={() => respondToInvitation('decline')}
              disabled={responding}
              variant="outline"
              className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              招待を辞退
            </Button>
          </div>

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
