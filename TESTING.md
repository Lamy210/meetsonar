# MeetSonar Chat Testing Guide

## 🚀 Quick Start

### 自動テスト実行
```bash
# 全体テスト実行
./run-tests.sh

# または Just を使用
just test-simple

# APIのみテスト
bun run test:api
```

## 🧪 テスト種類

### 1. 自動テスト ✅

- **API エンドポイントテスト**: REST API の動作確認 ✅ PASS (6 tests)
- **サービス可用性テスト**: バックエンド・フロントエンドの稼働確認 ✅ PASS
- **基本接続テスト**: WebSocket 接続の基本動作 ✅ PASS
- **TypeScript 型チェック**: コードの型安全性 ✅ PASS (0 errors)

### 2. 手動テスト 🖱️

#### チャット機能テスト
1. **基本チャットテスト**
   ```
   ブラウザタブ1: http://localhost:5173/room/test?name=Alice
   ブラウザタブ2: http://localhost:5173/room/test?name=Bob
   ```

2. **マルチユーザーテスト**
   ```
   ブラウザタブ1: http://localhost:5173/room/multi?name=Alice
   ブラウザタブ2: http://localhost:5173/room/multi?name=Bob  
   ブラウザタブ3: http://localhost:5173/room/multi?name=Charlie
   ```

3. **チャット履歴テスト**
   - 先に2人でチャット
   - 3人目が後から参加
   - 履歴が表示されることを確認

## ✅ テスト確認項目

### チャット基本機能
- [ ] メッセージ送信
- [ ] メッセージ受信
- [ ] リアルタイム同期
- [ ] 送信者の識別（自分のメッセージは右側、他者は左側）

### 参加者管理
- [ ] 新規参加者の表示
- [ ] 参加者一覧の更新
- [ ] ユーザー名の表示

### UI/UX
- [ ] チャットタブの切り替え
- [ ] メッセージの LINE風 スタイル
- [ ] タイムスタンプ表示
- [ ] 接続状態の表示

### エラーハンドリング
- [ ] 空メッセージの拒否
- [ ] 接続断時の処理
- [ ] 再接続機能

## 🔧 開発者向けテストコマンド

```bash
# 開発サーバー起動
docker compose up -d

# TypeScript チェック ✅ PASS
bun run check

# 個別テスト実行
bun test tests/integration/api.test.ts

# カバレッジ付きテスト
bun run test:coverage

# 監視モードでテスト
bun run test:watch

# 統合テスト実行
./run-tests.sh
```

## 📊 テスト結果の確認

### 成功パターン
```
🎉 All automated tests passed! Ready for manual testing.
```

### 失敗時の対処
1. Docker サービスが起動しているか確認
2. ポート 5000 (backend) と 5173 (frontend) が空いているか確認
3. データベース接続を確認

## 🐛 既知の問題

- WebSocket の統合テストは手動確認を推奨
- E2E テストは現在セットアップ中
- 大量接続時の負荷テストは未実装

## 📝 テスト拡張

将来的に追加予定：
- Playwright E2E テスト
- WebRTC ストリーミングテスト  
- パフォーマンステスト
- セキュリティテスト
