# 技術仕様書 - メディアデバイス設定機能

## 📋 概要

このドキュメントは、VideoCall Proのメディアデバイス設定機能の技術仕様を詳述します。

## 🏗️ システム構成

### アーキテクチャ図
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Settings UI    │───▶│  MediaSettings   │───▶│   WebRTC Hook   │
│  (Modal)        │    │  Hook            │    │  (useWebRTC)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  User Actions   │    │  LocalStorage    │    │  MediaStream    │
│  (Click/Select) │    │  (Persistence)   │    │  (Audio/Video)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### データフロー
```
1. User Interaction ─→ Settings Update ─→ LocalStorage Save
                                    │
                                    ▼
2. Settings Change ─→ Constraints Generation ─→ Stream Refresh
                                    │
                                    ▼  
3. Stream Update ─→ Peer Connection Update ─→ Remote Participants
```

## 🔧 技術スタック

### フロントエンド
- **React 18**: UI コンポーネント
- **TypeScript**: 型安全性
- **Tailwind CSS**: スタイリング
- **Radix UI**: UI プリミティブ

### WebRTC技術
- **MediaDevices API**: デバイス検出・制御
- **getUserMedia**: メディアストリーム取得
- **RTCPeerConnection**: P2P通信
- **MediaStreamTrack**: トラック管理

### データ永続化
- **LocalStorage**: 設定保存
- **JSON Serialization**: データ形式

## 📊 データモデル

### MediaSettings型定義
```typescript
interface MediaSettings {
  // デバイス識別子
  audioDeviceId: string;           // オーディオ入力デバイスID
  videoDeviceId: string;           // ビデオ入力デバイスID
  
  // 品質設定
  videoResolution: Resolution;     // ビデオ解像度
  audioVolume: number;             // 音量レベル (0-100)
  
  // オーディオ処理設定
  echoCancellation: boolean;       // エコーキャンセレーション
  noiseSuppression: boolean;       // ノイズ抑制
  autoGainControl: boolean;        // 自動ゲイン制御
}

type Resolution = "480p" | "720p" | "1080p";
```

### MediaDevice型定義
```typescript
interface MediaDevice {
  deviceId: string;                // ユニークID
  label: string;                   // 表示名
  kind: MediaDeviceKind;           // デバイス種別
}

type MediaDeviceKind = "audioinput" | "videoinput" | "audiooutput";
```

## 🎯 コア機能

### 1. デバイス検出・管理

#### デバイス一覧取得
```typescript
const refreshDevices = async (): Promise<void> => {
  try {
    // 1. 権限取得のための一時ストリーム
    const tempStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // 2. デバイス一覧取得
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    // 3. 一時ストリーム停止
    tempStream.getTracks().forEach(track => track.stop());
    
    // 4. デバイス分類
    categorizeDevices(devices);
    
  } catch (error) {
    handleDeviceError(error);
  }
};
```

#### デバイス分類処理
```typescript
const categorizeDevices = (devices: MediaDeviceInfo[]) => {
  const audio: MediaDevice[] = [];
  const video: MediaDevice[] = [];
  const output: MediaDevice[] = [];
  
  devices.forEach(device => {
    const mediaDevice: MediaDevice = {
      deviceId: device.deviceId,
      label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
      kind: device.kind as MediaDeviceKind
    };
    
    switch (device.kind) {
      case "audioinput":
        audio.push(mediaDevice);
        break;
      case "videoinput":
        video.push(mediaDevice);
        break;
      case "audiooutput":
        output.push(mediaDevice);
        break;
    }
  });
  
  setAudioDevices(audio);
  setVideoDevices(video);
  setOutputDevices(output);
};
```

### 2. 制約生成アルゴリズム

#### 解像度マッピング
```typescript
const RESOLUTION_CONSTRAINTS: Record<Resolution, MediaTrackConstraints> = {
  "480p": { width: { ideal: 640 }, height: { ideal: 480 } },
  "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
  "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } }
};
```

#### 制約生成ロジック
```typescript
const getMediaConstraints = (): MediaStreamConstraints => {
  const videoConstraints = settings.videoDeviceId === "none" ? false : {
    deviceId: settings.videoDeviceId === "default" 
      ? undefined 
      : { exact: settings.videoDeviceId },
    ...RESOLUTION_CONSTRAINTS[settings.videoResolution],
    facingMode: "user"
  };
  
  const audioConstraints = settings.audioDeviceId === "none" ? false : {
    deviceId: settings.audioDeviceId === "default" 
      ? undefined 
      : { exact: settings.audioDeviceId },
    echoCancellation: settings.echoCancellation,
    noiseSuppression: settings.noiseSuppression,
    autoGainControl: settings.autoGainControl
  };
  
  return {
    video: videoConstraints,
    audio: audioConstraints
  };
};
```

### 3. ストリーム更新処理

#### 既存ストリーム停止
```typescript
const stopExistingStream = () => {
  if (localStreamRef.current) {
    localStreamRef.current.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped track: ${track.kind} - ${track.label}`);
    });
    localStreamRef.current = null;
  }
};
```

#### 新ストリーム取得
```typescript
const createNewStream = async (): Promise<MediaStream> => {
  const constraints = getMediaConstraints();
  console.log("Creating stream with constraints:", constraints);
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // トラック状態の適用
    stream.getAudioTracks().forEach(track => {
      track.enabled = isAudioEnabled;
    });
    stream.getVideoTracks().forEach(track => {
      track.enabled = isVideoEnabled;
    });
    
    return stream;
  } catch (error) {
    console.error("Failed to create stream:", error);
    throw error;
  }
};
```

#### ピア接続更新
```typescript
const updatePeerConnections = async (newStream: MediaStream) => {
  const updatePromises = Array.from(peerConnections.current.entries()).map(
    async ([connectionId, pc]) => {
      try {
        // 既存sender削除
        const senders = pc.getSenders();
        for (const sender of senders) {
          if (sender.track) {
            await pc.removeTrack(sender);
          }
        }
        
        // 新トラック追加
        newStream.getTracks().forEach(track => {
          pc.addTrack(track, newStream);
        });
        
        console.log(`Updated tracks for peer: ${connectionId}`);
      } catch (error) {
        console.error(`Failed to update peer ${connectionId}:`, error);
      }
    }
  );
  
  await Promise.allSettled(updatePromises);
};
```

## 🔄 状態管理

### React State構成
```typescript
// useMediaSettings Hook内部状態
const [settings, setSettings] = useState<MediaSettings>(defaultSettings);
const [audioDevices, setAudioDevices] = useState<MediaDevice[]>([]);
const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
const [outputDevices, setOutputDevices] = useState<MediaDevice[]>([]);
const [isLoading, setIsLoading] = useState<boolean>(true);

// SettingsModal Component内部状態
const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
const [isPreviewActive, setIsPreviewActive] = useState<boolean>(false);
```

### LocalStorage同期
```typescript
// 設定読み込み
const loadSettings = (): MediaSettings => {
  try {
    const saved = localStorage.getItem("mediaSettings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
};

// 設定保存
const saveSettings = (newSettings: MediaSettings) => {
  try {
    localStorage.setItem("mediaSettings", JSON.stringify(newSettings));
    console.log("Settings saved successfully");
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};
```

## 🎨 UI/UX設計

### コンポーネント階層
```
SettingsModal
├── Dialog (Radix UI)
│   ├── DialogHeader
│   │   └── Title + RefreshButton
│   ├── DialogContent
│   │   ├── AudioSection
│   │   │   ├── DeviceSelect
│   │   │   ├── VolumeSlider
│   │   │   └── AudioEnhancements
│   │   ├── VideoSection
│   │   │   ├── DeviceSelect
│   │   │   ├── ResolutionSelect
│   │   │   └── PreviewArea
│   │   └── OutputSection
│   │       └── SpeakerSelect
│   └── DialogFooter
│       ├── SaveButton
│       └── CancelButton
```

### レスポンシブデザイン
```css
/* デスクトップ */
@media (min-width: 768px) {
  .settings-modal {
    max-width: 512px;
    padding: 24px;
  }
}

/* タブレット */
@media (max-width: 767px) {
  .settings-modal {
    max-width: 400px;
    padding: 16px;
  }
}

/* モバイル */
@media (max-width: 479px) {
  .settings-modal {
    max-width: 320px;
    padding: 12px;
  }
}
```

## 🔍 プレビュー機能

### プレビューストリーム管理
```typescript
const PreviewManager = {
  start: async (constraints: MediaStreamConstraints) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.error("Preview start failed:", error);
      throw error;
    }
  },
  
  stop: (stream: MediaStream | null) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  },
  
  attachToVideo: (stream: MediaStream, videoElement: HTMLVideoElement) => {
    videoElement.srcObject = stream;
    videoElement.play().catch(error => {
      console.error("Video play failed:", error);
    });
  }
};
```

### リソース管理
```typescript
// モーダル閉時の自動クリーンアップ
useEffect(() => {
  if (!isOpen) {
    PreviewManager.stop(previewStream);
    setPreviewStream(null);
    setIsPreviewActive(false);
  }
}, [isOpen]);

// コンポーネントアンマウント時のクリーンアップ
useEffect(() => {
  return () => {
    PreviewManager.stop(previewStream);
  };
}, []);
```

## 🚨 エラーハンドリング

### エラー分類
```typescript
enum MediaError {
  PERMISSION_DENIED = "NotAllowedError",
  DEVICE_NOT_FOUND = "NotFoundError", 
  DEVICE_IN_USE = "NotReadableError",
  CONSTRAINTS_ERROR = "OverconstrainedError",
  OPERATION_ABORTED = "AbortError"
}
```

### エラー処理フロー
```typescript
const handleMediaError = (error: DOMException) => {
  switch (error.name) {
    case MediaError.PERMISSION_DENIED:
      showPermissionDialog();
      break;
    case MediaError.DEVICE_NOT_FOUND:
      fallbackToDefaultDevice();
      break;
    case MediaError.DEVICE_IN_USE:
      showDeviceBusyWarning();
      break;
    case MediaError.CONSTRAINTS_ERROR:
      relaxConstraints();
      break;
    case MediaError.OPERATION_ABORTED:
      retryOperation();
      break;
    default:
      showGenericError(error);
  }
};
```

### フォールバック戦略
```typescript
const createStreamWithFallback = async (): Promise<MediaStream> => {
  const fallbackSequence = [
    () => getUserMedia(getMediaConstraints()),
    () => getUserMedia(getReducedConstraints()),
    () => getUserMedia(getMinimalConstraints()),
    () => createEmptyStream()
  ];
  
  for (const attempt of fallbackSequence) {
    try {
      return await attempt();
    } catch (error) {
      console.warn("Stream creation attempt failed:", error);
    }
  }
  
  throw new Error("All stream creation attempts failed");
};
```

## 📈 パフォーマンス最適化

### デバイス検出最適化
```typescript
// デバイス変更検出の最適化
let deviceChangeTimeout: NodeJS.Timeout;

const handleDeviceChange = () => {
  clearTimeout(deviceChangeTimeout);
  deviceChangeTimeout = setTimeout(() => {
    refreshDevices();
  }, 1000); // 1秒のデバウンス
};
```

### メモリ管理
```typescript
// ストリーム参照の適切な管理
class StreamManager {
  private streams = new Set<MediaStream>();
  
  register(stream: MediaStream) {
    this.streams.add(stream);
  }
  
  cleanup() {
    this.streams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.streams.clear();
  }
}
```

## 🧪 テスト戦略

### ユニットテスト
```typescript
describe('useMediaSettings', () => {
  beforeEach(() => {
    mockNavigatorMediaDevices();
  });
  
  test('should load settings from localStorage', () => {
    const savedSettings = { audioDeviceId: 'mic123' };
    localStorage.setItem('mediaSettings', JSON.stringify(savedSettings));
    
    const { result } = renderHook(() => useMediaSettings());
    expect(result.current.settings.audioDeviceId).toBe('mic123');
  });
  
  test('should generate correct constraints', () => {
    const { result } = renderHook(() => useMediaSettings());
    act(() => {
      result.current.updateSettings({
        videoResolution: '1080p',
        echoCancellation: false
      });
    });
    
    const constraints = result.current.getMediaConstraints();
    expect(constraints.video.width).toEqual({ ideal: 1920 });
    expect(constraints.audio.echoCancellation).toBe(false);
  });
});
```

### 統合テスト
```typescript
describe('Settings Integration', () => {
  test('should update stream when settings change', async () => {
    render(<CallPage />);
    
    // 設定モーダルを開く
    fireEvent.click(screen.getByTestId('settings-button'));
    
    // デバイスを変更
    fireEvent.change(screen.getByTestId('video-device-select'), {
      target: { value: 'camera123' }
    });
    
    // 設定を保存
    fireEvent.click(screen.getByText('設定を保存'));
    
    // ストリームが更新されることを確認
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({
            deviceId: { exact: 'camera123' }
          })
        })
      );
    });
  });
});
```

## 📚 依存関係

### 外部ライブラリ
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "@radix-ui/react-dialog": "^1.0.0",
  "@radix-ui/react-select": "^1.0.0",
  "@radix-ui/react-slider": "^1.0.0",
  "@radix-ui/react-switch": "^1.0.0",
  "lucide-react": "^0.300.0"
}
```

### ブラウザAPI
- `navigator.mediaDevices.getUserMedia()`
- `navigator.mediaDevices.enumerateDevices()`
- `navigator.mediaDevices.addEventListener()`
- `localStorage`
- `RTCPeerConnection`

## 🔮 将来の拡張

### 予定機能
1. **オーディオレベルメーター**: 音声入力レベルの可視化
2. **ビデオフィルター**: 背景ぼかし、美肌効果
3. **帯域制限設定**: ネットワーク状況対応
4. **プリセット保存**: 設定パターンの保存・切り替え
5. **デバイステスト**: 設定前の動作確認

### 技術的改善
1. **WebCodecs API**: より高度な映像処理
2. **WebAssembly**: 高性能フィルタリング
3. **Service Worker**: オフライン設定同期
4. **IndexedDB**: 大容量設定データ

この技術仕様書により、開発者は機能の全体像と実装詳細を理解できます。
