# メディアデバイス設定機能 - 完全ガイド

## 📋 目次
1. [概要](#概要)
2. [実装構成](#実装構成)
3. [設定可能項目](#設定可能項目)
4. [使用方法](#使用方法)
5. [API仕様](#api仕様)
6. [トラブルシューティング](#トラブルシューティング)
7. [開発者向け情報](#開発者向け情報)

## 概要

この機能により、ユーザーは通話中にマイク、カメラ、音質設定を動的に変更できます。設定はブラウザのLocalStorageに保存され、次回アクセス時も維持されます。

### 解決した課題
- ❌ デフォルト設定が固定で変更不可
- ❌ 利用可能デバイスが不明
- ❌ 設定変更が通話に即座に反映されない
- ❌ プレビュー機能がない

### 新機能
- ✅ 動的デバイス検出・選択
- ✅ リアルタイムプレビュー
- ✅ 詳細なオーディオ設定
- ✅ 設定の永続化
- ✅ 即座のストリーム更新

## 実装構成

```
client/src/
├── hooks/
│   └── use-media-settings.tsx    # メディア設定管理Hook
├── components/
│   └── settings-modal.tsx        # 設定UI
└── pages/
    └── call.tsx                  # 設定機能統合
```

### ファイル構成詳細

#### `use-media-settings.tsx`
- デバイス一覧の取得・管理
- 設定の永続化
- MediaStreamConstraints生成

#### `settings-modal.tsx`
- 設定UI提供
- プレビュー機能
- デバイス選択インターフェース

#### 統合された`use-webrtc.tsx`
- 設定変更時のストリーム更新
- ピア接続への反映

## 設定可能項目

### 🎤 オーディオ設定
| 項目 | 型 | 説明 | デフォルト |
|------|----|----|-----------|
| `audioDeviceId` | string | マイクデバイスID | "default" |
| `audioVolume` | number | 音量レベル (0-100) | 80 |
| `echoCancellation` | boolean | エコーキャンセレーション | true |
| `noiseSuppression` | boolean | ノイズ抑制 | true |
| `autoGainControl` | boolean | 自動ゲイン制御 | true |

### 📹 ビデオ設定
| 項目 | 型 | 説明 | デフォルト |
|------|----|----|-----------|
| `videoDeviceId` | string | カメラデバイスID | "default" |
| `videoResolution` | "480p"\|"720p"\|"1080p" | 解像度 | "720p" |

### 🔊 出力設定
| 項目 | 型 | 説明 | デフォルト |
|------|----|----|-----------|
| `outputDeviceId` | string | スピーカーデバイスID | "default" |

## 使用方法

### 1. 設定画面へのアクセス

```typescript
// 通話画面で設定ボタンをクリック
<Button onClick={() => setShowSettings(true)}>
  <Settings className="h-4 w-4" />
</Button>
```

### 2. デバイス選択

#### マイク設定
1. 「マイク」ドロップダウンをクリック
2. 利用可能なマイクデバイスから選択
3. 「マイクなし」でミュート状態

#### カメラ設定
1. 「カメラ」ドロップダウンをクリック
2. 利用可能なカメラデバイスから選択
3. 「カメラなし」でビデオオフ状態

#### 解像度設定
```typescript
const resolutions = {
  "480p": { width: { ideal: 640 }, height: { ideal: 480 } },
  "720p": { width: { ideal: 1280 }, height: { ideal: 720 } },
  "1080p": { width: { ideal: 1920 }, height: { ideal: 1080 } }
};
```

### 3. プレビュー機能

#### カメラプレビュー
```typescript
const startPreview = async () => {
  const constraints = getMediaConstraints();
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoPreviewRef.current.srcObject = stream;
};
```

#### 操作方法
- ▶️ ボタン: プレビュー開始
- ⏹️ ボタン: プレビュー停止
- 自動停止: モーダル閉時

### 4. 詳細設定

#### オーディオ拡張機能
```typescript
// エコーキャンセレーション
updateSettings({ echoCancellation: true });

// ノイズ抑制
updateSettings({ noiseSuppression: true });

// 自動ゲイン制御
updateSettings({ autoGainControl: true });
```

#### 音量調整
```typescript
// 音量設定 (0-100)
updateSettings({ audioVolume: 75 });
```

### 5. 設定保存・適用

```typescript
const handleSave = () => {
  // LocalStorageに保存
  localStorage.setItem("mediaSettings", JSON.stringify(settings));
  
  // WebRTCストリーム更新
  onSettingsChange?.(); // refreshMediaSettings()を呼び出し
  
  onClose();
};
```

## API仕様

### `useMediaSettings` Hook

#### 返り値
```typescript
interface UseMediaSettingsReturn {
  settings: MediaSettings;           // 現在の設定
  audioDevices: MediaDevice[];       // オーディオ入力デバイス一覧
  videoDevices: MediaDevice[];       // ビデオ入力デバイス一覧
  outputDevices: MediaDevice[];      // オーディオ出力デバイス一覧
  isLoading: boolean;                // デバイス読み込み中フラグ
  updateSettings: (newSettings: Partial<MediaSettings>) => void;
  refreshDevices: () => Promise<void>;
  getMediaConstraints: () => MediaStreamConstraints;
}
```

#### 主要関数

##### `updateSettings()`
```typescript
// 部分的な設定更新
updateSettings({ 
  videoDeviceId: "camera123",
  videoResolution: "1080p" 
});
```

##### `refreshDevices()`
```typescript
// デバイス一覧を再取得
await refreshDevices();
```

##### `getMediaConstraints()`
```typescript
// 現在の設定からWebRTC制約を生成
const constraints = getMediaConstraints();
// 返り値例:
{
  video: {
    deviceId: { exact: "camera123" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: "user"
  },
  audio: {
    deviceId: { exact: "mic456" },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}
```

### `SettingsModal` Component

#### Props
```typescript
interface SettingsModalProps {
  isOpen: boolean;                          // モーダル表示状態
  onClose: () => void;                      // 閉じる時のコールバック
  onSettingsChange?: () => void;            // 設定変更時のコールバック
}
```

#### 内部状態
```typescript
const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
const [isPreviewActive, setIsPreviewActive] = useState(false);
```

### WebRTC統合

#### `refreshMediaSettings()`
```typescript
const refreshMediaSettings = async () => {
  // 1. デバイス一覧更新
  await refreshDevices();
  
  // 2. 既存ストリーム停止
  localStreamRef.current?.getTracks().forEach(track => track.stop());
  
  // 3. 新しい制約でストリーム取得
  const constraints = getMediaConstraints();
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  
  // 4. オーディオ・ビデオ状態適用
  stream.getAudioTracks().forEach(track => {
    track.enabled = isAudioEnabled;
  });
  stream.getVideoTracks().forEach(track => {
    track.enabled = isVideoEnabled;
  });
  
  // 5. ローカルストリーム更新
  localStreamRef.current = stream;
  setLocalStream(stream);
  
  // 6. 全ピア接続にトラック更新を送信
  peerConnections.current.forEach(async (pc, connectionId) => {
    try {
      // 既存senderを削除
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track) {
          await pc.removeTrack(sender);
        }
      }
      
      // 新しいトラックを追加
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } catch (error) {
      console.error("Failed to update tracks for peer:", connectionId, error);
    }
  });
};
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. デバイスが検出されない

**症状**: デバイス一覧が空または「デフォルト」のみ表示

**原因と対策**:
```typescript
// 権限が未許可の場合
try {
  // 一時的にストリームを取得して権限を要求
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: true, 
    audio: true 
  });
  stream.getTracks().forEach(track => track.stop());
} catch (error) {
  console.error("Permission denied:", error);
  // ユーザーに権限許可を促す
}
```

**対策手順**:
1. ブラウザの設定でカメラ・マイク権限を確認
2. 🔄リフレッシュボタンをクリック
3. ページを再読み込み

#### 2. プレビューが表示されない

**症状**: カメラプレビューが黒画面またはエラー

**デバッグ方法**:
```typescript
const startPreview = async () => {
  try {
    const constraints = getMediaConstraints();
    console.log("Preview constraints:", constraints);
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log("Preview stream:", {
      id: stream.id,
      tracks: stream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled }))
    });
    
    setPreviewStream(stream);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = stream;
    }
  } catch (error) {
    console.error("Preview failed:", error);
    // エラー詳細を表示
  }
};
```

**対策**:
1. カメラが「なし」に設定されていないか確認
2. 他のアプリケーションがカメラを使用中でないか確認
3. デバイスIDが正しいか確認

#### 3. 設定が保存されない

**症状**: ページリロード後に設定が初期値に戻る

**原因**:
- LocalStorageが無効
- プライベートブラウジングモード
- ストレージ容量不足

**確認方法**:
```typescript
// LocalStorage動作確認
try {
  localStorage.setItem("test", "value");
  const value = localStorage.getItem("test");
  localStorage.removeItem("test");
  console.log("LocalStorage working:", value === "value");
} catch (error) {
  console.error("LocalStorage not available:", error);
}
```

#### 4. 通話中の設定変更が反映されない

**症状**: 設定変更後も古いデバイスが使用される

**デバッグ**:
```typescript
// ストリーム更新の確認
console.log("Before update:", {
  localStream: localStreamRef.current?.id,
  tracks: localStreamRef.current?.getTracks().map(t => ({ 
    kind: t.kind, 
    label: t.label,
    enabled: t.enabled 
  }))
});

await refreshMediaSettings();

console.log("After update:", {
  localStream: localStreamRef.current?.id,
  tracks: localStreamRef.current?.getTracks().map(t => ({ 
    kind: t.kind, 
    label: t.label,
    enabled: t.enabled 
  }))
});
```

**対策**:
1. 「設定を保存」ボタンを必ずクリック
2. コンソールでエラーログを確認
3. ピア接続の状態を確認

### エラーコード一覧

| エラー | 原因 | 対策 |
|--------|------|------|
| `NotAllowedError` | 権限が拒否された | ブラウザ設定で権限を許可 |
| `NotFoundError` | デバイスが見つからない | デバイス接続を確認 |
| `NotReadableError` | デバイスが使用中 | 他のアプリを終了 |
| `OverconstrainedError` | 制約が厳しすぎる | 解像度を下げる |
| `AbortError` | 操作が中断された | 再試行 |

## 開発者向け情報

### 拡張ポイント

#### 1. 新しいデバイス種別の追加

```typescript
// use-media-settings.tsx
interface MediaSettings {
  // ...existing settings
  speakerDeviceId: string;  // スピーカー選択
  microphoneSensitivity: number;  // マイク感度
}

// 制約生成の拡張
const getMediaConstraints = (): MediaStreamConstraints => {
  return {
    audio: {
      // ...existing audio constraints
      volume: settings.microphoneSensitivity / 100,
    },
    // ...
  };
};
```

#### 2. プリセット機能の追加

```typescript
interface MediaPreset {
  name: string;
  settings: MediaSettings;
}

const useMediaPresets = () => {
  const [presets, setPresets] = useState<MediaPreset[]>([]);
  
  const savePreset = (name: string, settings: MediaSettings) => {
    const newPreset = { name, settings };
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem("mediaPresets", JSON.stringify(updatedPresets));
  };
  
  const loadPreset = (presetName: string) => {
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      updateSettings(preset.settings);
    }
  };
  
  return { presets, savePreset, loadPreset };
};
```

#### 3. 音声レベルメーターの追加

```typescript
const useAudioLevelMeter = (stream: MediaStream | null) => {
  const [audioLevel, setAudioLevel] = useState(0);
  
  useEffect(() => {
    if (!stream) return;
    
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(average / 255 * 100);
      requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
    
    return () => {
      audioContext.close();
    };
  }, [stream]);
  
  return audioLevel;
};
```

### パフォーマンス最適化

#### 1. デバイス一覧のキャッシュ

```typescript
// デバイス変更時のみ再取得
let deviceListCache: MediaDeviceInfo[] = [];
let lastDeviceChangeTime = 0;

const getCachedDevices = async (): Promise<MediaDeviceInfo[]> => {
  const now = Date.now();
  if (now - lastDeviceChangeTime < 5000) { // 5秒以内はキャッシュ使用
    return deviceListCache;
  }
  
  deviceListCache = await navigator.mediaDevices.enumerateDevices();
  lastDeviceChangeTime = now;
  return deviceListCache;
};
```

#### 2. ストリーム更新の最適化

```typescript
// 必要なトラックのみ更新
const updateSpecificTrack = async (kind: "audio" | "video") => {
  const constraints = getMediaConstraints();
  const newConstraints = kind === "audio" 
    ? { audio: constraints.audio, video: false }
    : { video: constraints.video, audio: false };
    
  const stream = await navigator.mediaDevices.getUserMedia(newConstraints);
  const newTrack = stream.getTracks()[0];
  
  // 既存のトラックを置換
  peerConnections.current.forEach((pc) => {
    const sender = pc.getSenders().find(s => s.track?.kind === kind);
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  });
};
```

### テスト方法

#### 1. ユニットテスト例

```typescript
// use-media-settings.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
import { useMediaSettings } from './use-media-settings';

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});

describe('useMediaSettings', () => {
  test('should initialize with default settings', () => {
    const { result } = renderHook(() => useMediaSettings());
    
    expect(result.current.settings.audioDeviceId).toBe('default');
    expect(result.current.settings.videoDeviceId).toBe('default');
    expect(result.current.settings.videoResolution).toBe('720p');
  });
  
  test('should update settings', () => {
    const { result } = renderHook(() => useMediaSettings());
    
    act(() => {
      result.current.updateSettings({ audioDeviceId: 'mic123' });
    });
    
    expect(result.current.settings.audioDeviceId).toBe('mic123');
  });
});
```

#### 2. E2Eテスト例

```typescript
// settings-modal.e2e.test.ts
import { test, expect } from '@playwright/test';

test('settings modal functionality', async ({ page }) => {
  // ページに移動
  await page.goto('/room/test-room');
  
  // 設定ボタンをクリック
  await page.click('[data-testid="settings-button"]');
  
  // モーダルが表示されることを確認
  await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
  
  // マイク選択
  await page.click('[data-testid="audio-device-select"]');
  await page.click('text=Built-in Microphone');
  
  // 解像度選択
  await page.click('[data-testid="video-resolution-select"]');
  await page.click('text=1080p');
  
  // プレビュー開始
  await page.click('[data-testid="preview-button"]');
  await expect(page.locator('video[data-testid="preview-video"]')).toBeVisible();
  
  // 設定保存
  await page.click('button:text("設定を保存")');
  
  // モーダルが閉じることを確認
  await expect(page.locator('[data-testid="settings-modal"]')).not.toBeVisible();
});
```

これで完全なドキュメントが作成されました。ユーザー向けの使用方法から開発者向けの詳細情報まで網羅しています。
