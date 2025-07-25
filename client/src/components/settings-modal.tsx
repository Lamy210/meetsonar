import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMediaSettings } from "@/hooks/use-media-settings";
import { RefreshCw, Camera, Mic, Volume2, Play, Square } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSettingsChange }: SettingsModalProps) {
  const {
    settings,
    audioDevices,
    videoDevices,
    outputDevices,
    isLoading,
    updateSettings,
    refreshDevices,
    getMediaConstraints,
  } = useMediaSettings();

  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const handleSave = () => {
    onSettingsChange?.();
    onClose();
  };

  const startPreview = async () => {
    try {
      const constraints = getMediaConstraints();
      console.log("Starting preview with constraints:", constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPreviewStream(stream);
      setIsPreviewActive(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Failed to start preview:", error);
    }
  };

  const stopPreview = () => {
    if (previewStream) {
      previewStream.getTracks().forEach(track => track.stop());
      setPreviewStream(null);
    }
    setIsPreviewActive(false);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  // Clean up preview when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopPreview();
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>メディア設定</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshDevices}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audio Settings */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Mic className="h-4 w-4" />
              <span>オーディオ設定</span>
            </h4>
            <div className="space-y-4">
              <div>
                <Label className="block text-sm text-slate-400 mb-2">マイク</Label>
                <Select 
                  value={settings.audioDeviceId} 
                  onValueChange={(value) => updateSettings({ audioDeviceId: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="マイクを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="default">デフォルトマイク</SelectItem>
                    <SelectItem value="none">マイクなし</SelectItem>
                    {audioDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm text-slate-400 mb-2">
                  音量: {settings.audioVolume}%
                </Label>
                <Slider
                  value={[settings.audioVolume]}
                  onValueChange={([value]) => updateSettings({ audioVolume: value })}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Audio Enhancement Settings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-400">エコーキャンセレーション</Label>
                  <Switch
                    checked={settings.echoCancellation}
                    onCheckedChange={(checked) => updateSettings({ echoCancellation: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-400">ノイズ抑制</Label>
                  <Switch
                    checked={settings.noiseSuppression}
                    onCheckedChange={(checked) => updateSettings({ noiseSuppression: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-slate-400">自動ゲイン制御</Label>
                  <Switch
                    checked={settings.autoGainControl}
                    onCheckedChange={(checked) => updateSettings({ autoGainControl: checked })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Video Settings */}
          <div>
            <h4 className="font-medium mb-3 flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>ビデオ設定</span>
            </h4>
            <div className="space-y-4">
              <div>
                <Label className="block text-sm text-slate-400 mb-2">カメラ</Label>
                <Select 
                  value={settings.videoDeviceId} 
                  onValueChange={(value) => updateSettings({ videoDeviceId: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="カメラを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="default">デフォルトカメラ</SelectItem>
                    <SelectItem value="none">カメラなし</SelectItem>
                    {videoDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="block text-sm text-slate-400 mb-2">解像度</Label>
                <Select 
                  value={settings.videoResolution} 
                  onValueChange={(value: "480p" | "720p" | "1080p") => updateSettings({ videoResolution: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="解像度を選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="480p">480p (標準)</SelectItem>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* カメラプレビュー */}
              <div>
                <Label className="block text-sm text-slate-400 mb-2">プレビュー</Label>
                <div className="relative bg-slate-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-40 object-cover bg-slate-800"
                    style={{ display: settings.videoDeviceId === "none" ? "none" : "block" }}
                  />
                  {settings.videoDeviceId === "none" && (
                    <div className="w-full h-40 flex items-center justify-center text-slate-500">
                      <Camera className="h-8 w-8" />
                      <span className="ml-2">カメラが無効です</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2">
                    <Button
                      size="sm"
                      variant={isPreviewActive ? "destructive" : "default"}
                      onClick={isPreviewActive ? stopPreview : startPreview}
                      disabled={settings.videoDeviceId === "none"}
                      className="h-8 w-8 p-0"
                    >
                      {isPreviewActive ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Speaker Settings */}
          {outputDevices.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Volume2 className="h-4 w-4" />
                <span>スピーカー設定</span>
              </h4>
              <div>
                <Label className="block text-sm text-slate-400 mb-2">出力デバイス</Label>
                <Select defaultValue="default">
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="スピーカーを選択" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="default">デフォルトスピーカー</SelectItem>
                    {outputDevices.map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Device Status */}
          <div className="pt-2 border-t border-slate-700">
            <div className="text-xs text-slate-500 space-y-1">
              <div>検出されたデバイス:</div>
              <div>マイク: {audioDevices.length}個</div>
              <div>カメラ: {videoDevices.length}個</div>
              <div>スピーカー: {outputDevices.length}個</div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSave}
          >
            設定を保存
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={onClose}
          >
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
