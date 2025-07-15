import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Call Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audio Settings */}
          <div>
            <h4 className="font-medium mb-3">Audio</h4>
            <div className="space-y-3">
              <div>
                <Label className="block text-sm text-slate-400 mb-1">Microphone</Label>
                <Select>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="default">Default Microphone</SelectItem>
                    <SelectItem value="usb">USB Headset</SelectItem>
                    <SelectItem value="builtin">Built-in Microphone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-sm text-slate-400 mb-1">Volume</Label>
                <Slider
                  defaultValue={[80]}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div>
            <h4 className="font-medium mb-3">Video</h4>
            <div className="space-y-3">
              <div>
                <Label className="block text-sm text-slate-400 mb-1">Camera</Label>
                <Select>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="default">Default Camera</SelectItem>
                    <SelectItem value="external">External Webcam</SelectItem>
                    <SelectItem value="virtual">Virtual Camera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block text-sm text-slate-400 mb-1">Resolution</Label>
                <Select>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select resolution" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="720p">720p HD</SelectItem>
                    <SelectItem value="1080p">1080p Full HD</SelectItem>
                    <SelectItem value="480p">480p Standard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button className="flex-1 bg-primary hover:bg-primary/90">
            Save Changes
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
