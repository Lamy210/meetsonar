import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/minimal-dialog";
import { Button } from "@/components/ui/minimal-button";
import { Input } from "@/components/ui/minimal-input";
import { Label } from "@/components/ui/minimal-label";
import { Copy, Mail, Send, Clock, Link, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  displayName?: string;
}

interface InvitationResponse {
  invitation: {
    id: number;
    roomId: string;
    inviterDisplayName: string;
    inviteeEmail: string;
    expiresAt: string;
  };
  inviteLink: string;
  message: string;
}

export default function InviteModal({ isOpen, onClose, roomId, displayName }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sentInvitations, setSentInvitations] = useState<InvitationResponse[]>([]);
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/room/${roomId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "リンクをコピーしました！",
        description: "ミーティングリンクがクリップボードにコピーされました。",
      });
    } catch (error) {
      toast({
        title: "コピーに失敗しました",
        description: "リンクをクリップボードにコピーできませんでした。",
        variant: "destructive",
      });
    }
  };

  const sendInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "メールアドレスが必要です",
        description: "招待するユーザーのメールアドレスを入力してください。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          inviteeEmail: email.trim(),
          inviteeDisplayName: inviteeName.trim() || undefined,
          inviterDisplayName: displayName || "Anonymous User",
          expirationHours: 24, // 24時間有効
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const data: InvitationResponse = await response.json();
      setSentInvitations(prev => [...prev, data]);
      
      toast({
        title: "招待を送信しました！",
        description: `${email}に招待が送信されました。`,
      });
      
      setEmail("");
      setInviteeName("");
    } catch (error) {
      toast({
        title: "招待の送信に失敗しました",
        description: error instanceof Error ? error.message : "予期しないエラーが発生しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteLink = async (inviteLink: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "招待リンクをコピーしました！",
        description: "専用の招待リンクがクリップボードにコピーされました。",
      });
    } catch (error) {
      toast({
        title: "コピーに失敗しました",
        description: "リンクをクリップボードにコピーできませんでした。",
        variant: "destructive",
      });
    }
  };

  const generateUrlInvite = () => {
    const baseUrl = `${window.location.origin}/join/${roomId}`;
    const params = new URLSearchParams();
    
    // 招待者情報を追加
    if (displayName) {
      params.set('inviter', displayName);
    }
    
    // 招待される人の情報を追加
    if (email.trim()) {
      params.set('email', email.trim());
    }
    
    if (inviteeName.trim()) {
      params.set('name', inviteeName.trim());
    }
    
    // カスタムメッセージ（将来的に追加予定）
    // params.set('message', 'ミーティングに参加してください');
    
    // 有効期限（24時間後）
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);
    params.set('expires', expiry.toISOString());
    
    return `${baseUrl}?${params.toString()}`;
  };

  const copyUrlInvite = async () => {
    try {
      const urlInvite = generateUrlInvite();
      await navigator.clipboard.writeText(urlInvite);
      toast({
        title: "URL招待リンクをコピーしました！",
        description: "パラメータ付きの招待リンクがクリップボードにコピーされました。",
      });
    } catch (error) {
      toast({
        title: "コピーに失敗しました",
        description: "リンクをクリップボードにコピーできませんでした。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5" />
            <span>参加者を招待</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Share Link */}
          <div>
            <Label className="block text-sm text-slate-400 mb-2">クイック共有リンク</Label>
            <div className="flex space-x-2">
              <Input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-slate-700 border-slate-600 text-white"
              />
              <Button
                onClick={copyLink}
                className="bg-primary hover:bg-primary/90"
                size="icon"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              このリンクを共有して、誰でもミーティングに参加できます
            </p>
          </div>

          {/* URL Invitation */}
          <div className="border-t border-slate-700 pt-4">
            <Label className="block text-sm text-slate-400 mb-3">URL招待リンク生成</Label>
            
            <div className="space-y-3">
              <div>
                <Label className="block text-xs text-slate-500 mb-1">招待される方のメールアドレス (オプション)</Label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e: any) => setEmail(e.target?.value || '')}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              
              <div>
                <Label className="block text-xs text-slate-500 mb-1">招待される方の表示名 (オプション)</Label>
                <Input
                  type="text"
                  placeholder="招待される方の名前"
                  value={inviteeName}
                  onChange={(e: any) => setInviteeName(e.target?.value || '')}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={copyUrlInvite}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Link className="w-4 h-4 mr-2" />
                  URL招待リンクをコピー
                </Button>
                
                <Button
                  onClick={sendInvite}
                  disabled={!email.trim() || isLoading}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      個人招待を送信
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-xs text-slate-500">
                左: URLリンク生成、右: サーバー経由で個人招待を送信
              </p>
            </div>
          </div>

          {/* Sent Invitations */}
          {sentInvitations.length > 0 && (
            <div className="border-t border-slate-700 pt-4">
              <Label className="block text-sm text-slate-400 mb-3">送信済み招待</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sentInvitations.map((inv, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-3 text-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-white">{inv.invitation.inviteeEmail}</div>
                        <div className="text-xs text-slate-400 flex items-center space-x-2 mt-1">
                          <Clock className="w-3 h-3" />
                          <span>有効期限: {new Date(inv.invitation.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => copyInviteLink(inv.inviteLink)}
                        size="sm"
                        variant="outline"
                        className="ml-2 border-slate-600 text-slate-300 hover:bg-slate-600"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-700">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
