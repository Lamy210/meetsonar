# メディアデバイス設定機能の実装

## 概要
デフォルトカメラとマイクの設定が反映されない問題を解決し、ユーザーが設定を変更できる機能を実装しました。

## 実装内容

### 1. メディア設定管理Hook (`use-media-settings.tsx`)

#### 主な機能
- **デバイス検出**: 利用可能なオーディオ・ビデオデバイスを自動検出
- **設定保存**: LocalStorageにユーザー設定を永続化
- **制約生成**: 現在の設定からWebRTC用のMediaStreamConstraintsを生成
- **リアルタイム更新**: デバイス変更を自動検出してリスト更新

#### 設定項目
```typescript
interface MediaSettings {
  audioDeviceId: string;        // マイクデバイスID
  videoDeviceId: string;        // カメラデバイスID
  videoResolution: "480p" | "720p" | "1080p";
  audioVolume: number;          // 音量 (0-100)
  echoCancellation: boolean;    // エコーキャンセレーション
  noiseSuppression: boolean;    // ノイズ抑制
  autoGainControl: boolean;     // 自動ゲイン制御
}
```

### 2. 設定モーダル (`settings-modal.tsx`)

#### 新機能
- **実際のデバイス一覧**: 接続されているデバイスを動的に表示
- **カメラプレビュー**: 設定変更前に映像確認可能
- **オーディオ拡張設定**: エコーキャンセレーション等の詳細設定
- **デバイス更新**: リフレッシュボタンでデバイス一覧を再取得

#### UI改善
- デバイス数の表示
- プレビュー機能付きビデオ設定
- 日本語対応
- レスポンシブデザイン

### 3. WebRTC統合 (`use-webrtc.tsx`)

#### 改善点
- **動的制約**: 固定設定から`getMediaConstraints()`を使用
- **設定更新機能**: `refreshMediaSettings()`で既存ストリームを更新
- **ピア接続更新**: 設定変更時に全てのピア接続のトラックを更新

#### 主要関数
```typescript
const refreshMediaSettings = async () => {
  // 1. デバイス一覧更新
  await refreshDevices();
  
  // 2. 既存ストリーム停止
  localStreamRef.current?.getTracks().forEach(track => track.stop());
  
  // 3. 新しい設定でストリーム取得
  const stream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
  
  // 4. ピア接続のトラック更新
  peerConnections.current.forEach(async (pc) => {
    // 既存トラック削除 → 新しいトラック追加
  });
};
```

## 使用方法

### 1. 設定画面を開く
- 通話画面で設定ボタンをクリック
- 「メディア設定」モーダルが開く

### 2. デバイス選択
- **マイク**: ドロップダウンから選択
- **カメラ**: ドロップダウンから選択
- **解像度**: 480p/720p/1080pから選択

### 3. プレビュー確認
- カメラ設定でプレビューボタン（▶️）をクリック
- 実際の映像を確認
- 停止ボタン（⏹️）で終了

### 4. 詳細設定
- **エコーキャンセレーション**: ON/OFF切り替え
- **ノイズ抑制**: ON/OFF切り替え
- **自動ゲイン制御**: ON/OFF切り替え
- **音量**: スライダーで調整

### 5. 設定保存
- 「設定を保存」ボタンをクリック
- 設定がLocalStorageに保存
- 通話ストリームが新しい設定で更新

## 技術的特徴

### デバイス権限管理
```typescript
// 一時的にストリームを取得してデバイス一覧を取得
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
const devices = await navigator.mediaDevices.enumerateDevices();
stream.getTracks().forEach(track => track.stop()); // すぐに停止
```

### 制約の動的生成
```typescript
const getMediaConstraints = (): MediaStreamConstraints => {
  return {
    video: settings.videoDeviceId === "none" ? false : {
      deviceId: settings.videoDeviceId === "default" ? undefined : { exact: settings.videoDeviceId },
      width: { ideal: 1280 }, // 解像度に応じて動的変更
      height: { ideal: 720 },
      facingMode: "user"
    },
    audio: settings.audioDeviceId === "none" ? false : {
      deviceId: settings.audioDeviceId === "default" ? undefined : { exact: settings.audioDeviceId },
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
    }
  };
};
```

### エラーハンドリング
- デバイスアクセス失敗時のフォールバック
- 設定更新時のエラー処理
- ピア接続更新の失敗対応

## 解決した問題

1. **❌ デフォルト設定が反映されない**
   - ✅ 動的にデバイス設定を読み込み

2. **❌ ユーザーがデバイスを変更できない**
   - ✅ 直感的な設定UI提供

3. **❌ 設定変更が即座に反映されない**
   - ✅ リアルタイムでストリーム更新

4. **❌ どのデバイスが使用されているか不明**
   - ✅ プレビュー機能とデバイス情報表示

## 今後の拡張可能性

1. **音声レベルメーター**: マイク音量の視覚化
2. **ビデオフィルター**: 背景ぼかし、ライティング調整
3. **帯域制限**: ネットワーク状況に応じた品質調整
4. **デバイステスト**: 設定前の音声・映像テスト機能
5. **プリセット保存**: 複数の設定パターンの保存・切り替え

## トラブルシューティング

### デバイスが検出されない場合
1. ブラウザの権限設定を確認
2. デバイスが他のアプリケーションで使用中でないか確認
3. リフレッシュボタン（🔄）でデバイス一覧を更新

### 設定が反映されない場合
1. 「設定を保存」ボタンを必ずクリック
2. ブラウザのLocalStorageが有効か確認
3. コンソールログでエラーを確認

### プレビューが表示されない場合
1. カメラが「なし」に設定されていないか確認
2. 他のアプリケーションがカメラを使用中でないか確認
3. ブラウザの権限設定を確認
