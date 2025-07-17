# useWebRTC フック: 実装ノートとベストプラクティス

このドキュメントでは、`useWebRTC` フックの安定性、パフォーマンス、保守性を向上させるための主な変更点とベストプラクティスをまとめています。

## 1. ステートリファレンスを使ったステールクロージャの回避

- 問題: React のステート値（例: `isVideoEnabled`, `isRecording`）がコールバックにキャプチャされると、古い値が参照され続ける可能性があります。
- 解決策: 対応する `useRef` を導入し、最新値を常に参照できるようにします。

```ts
const isVideoEnabledRef = useRef(isVideoEnabled);
useEffect(() => {
  isVideoEnabledRef.current = isVideoEnabled;
}, [isVideoEnabled]);

const isRecordingRef = useRef(isRecording);
useEffect(() => {
  isRecordingRef.current = isRecording;
}, [isRecording]);
```

長時間動作するコールバック（例: `renderFrame`）内では、`.current` を使って最新のステート値を参照します。

## 2. レコーディングループの管理

- 問題: `requestAnimationFrame(renderFrame)` をキャンセルせずに録画を停止すると、CPU やメモリがリークします。
- 解決策:
  1. アニメーションフレーム ID を `useRef` で保持します。

```ts
const animationFrameIdRef = useRef<number>();
```

  2. レンダーループ内で ID を更新します。

```ts
animationFrameIdRef.current = requestAnimationFrame(renderFrame);
```

  3. 録画停止時またはコンポーネントアンマウント時にキャンセルします。

```ts
if (animationFrameIdRef.current) {
  cancelAnimationFrame(animationFrameIdRef.current);
}
```

## 3. アンマウント時のクリーンアップ

- 問題: コンポーネントアンマウント時に WebSocket、PeerConnection、MediaStream などのリソースが解放されず、リークします。
- 解決策: `useEffect` のクリーンアップ関数で `leaveCall()` を呼び出し、関連リソースを閉じます。

```ts
useEffect(() => {
  return () => {
    leaveCall(); 
    if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
  };
}, []);
```

## 4. 一度だけ実行される `ended` イベントリスナー

- 問題: 同じトラックに対して複数回 `ended` リスナーを登録すると、ハンドラーが重複実行されます。
- 解決策: `{ once: true }` を使い、最初の一回のみ実行されるようにします。

```ts
screenStream.getVideoTracks()[0].addEventListener(
  'ended',
  async () => { /* ... */ },
  { once: true }
);
```

## 5. トラック置換後の再ネゴシエーション

- 問題: `sender.replaceTrack(videoTrack)` だけでは自動的に再ネゴシエーションが発生せず、リモート映像がフリーズすることがあります。
- 解決策: `signalingState` が `stable` の場合に明示的に新しいオファーを生成・送信します。

```ts
if (pc.signalingState === 'stable') {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socketRef.current?.send(JSON.stringify({ type: 'offer', roomId, participantId, payload: offer }));
}
```

---

これらの変更により、以下を実現できます:

- 最新のステート値をコールバック内で確実に参照
- 停止時およびアンマウント時の確実なリソースクリーンアップ
- イベントリスナーの重複登録防止
- カメラと画面共有間のスムーズな切り替え
- トラック切り替え時の堅牢な再ネゴシエーション

今後、`useWebRTC` のメディア処理ロジックを変更した際には、本ドキュメントを更新してください。
