import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
}

export default function InviteModal({ isOpen, onClose, roomId }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const inviteLink = `${window.location.origin}/room/${roomId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast({
        title: "Link copied!",
        description: "The meeting link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy the link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const sendInvite = () => {
    if (!email.trim()) return;
    
    // In a real application, this would send an email invitation
    toast({
      title: "Invitation sent!",
      description: `Meeting invitation sent to ${email}`,
    });
    setEmail("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Participants</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="block text-sm text-slate-400 mb-2">Meeting Link</Label>
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
          </div>

          <div>
            <Label className="block text-sm text-slate-400 mb-2">Invite by Email</Label>
            <div className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Button
                onClick={sendInvite}
                disabled={!email.trim()}
                className="bg-primary hover:bg-primary/90"
                size="icon"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
