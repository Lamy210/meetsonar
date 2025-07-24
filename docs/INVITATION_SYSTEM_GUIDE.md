# 招待機能実装ガイド

## 概要

MeetSonarに包括的な招待機能を実装しました。ユーザーは他の参加者をミーティングに招待し、招待を受けた人はリンクからミーティングに参加できます。

## 機能一覧

### 1. 招待の送信
- **個人招待**: 特定のメールアドレスに招待を送信
- **クイック共有**: 汎用のミーティングリンクを共有
- **有効期限**: 招待に有効期限を設定（デフォルト24時間）
- **カスタム表示名**: 招待される人の表示名を指定可能

### 2. 招待の受信
- **専用招待ページ**: 招待リンクから専用ページにアクセス
- **招待情報表示**: 招待者名、ミーティング名、有効期限を表示
- **表示名入力**: 参加時の表示名を入力
- **参加/辞退**: 招待を受諾または辞退

### 3. 招待管理
- **送信履歴**: 送信した招待の一覧表示
- **ステータス追跡**: pending, accepted, declined, expired
- **招待リンクコピー**: 各招待の専用リンクをコピー

## API エンドポイント

### POST /api/rooms/:roomId/invite
招待を送信

```json
{
  "roomId": "room123",
  "inviteeEmail": "user@example.com",
  "inviteeDisplayName": "田中太郎",
  "inviterDisplayName": "佐藤花子",
  "expirationHours": 24
}
```

### GET /api/invitations/:token
招待情報を取得

### POST /api/invitations/:token/respond
招待に応答

```json
{
  "inviteToken": "abc123...",
  "action": "accept",
  "displayName": "田中太郎"
}
```

### GET /api/rooms/:roomId/invitations
ルームの招待一覧を取得

## データベーススキーマ

### invitations テーブル
```sql
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  room_id TEXT NOT NULL,
  inviter_user_id INTEGER,
  inviter_display_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  invitee_display_name TEXT,
  status TEXT DEFAULT 'pending',
  invite_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);
```

## UI コンポーネント

### 1. InviteModal
- **場所**: `client/src/components/invite-modal.tsx`
- **機能**: 招待送信UI、送信履歴表示
- **起動**: Call Controlsの招待ボタンから

### 2. InvitePage
- **場所**: `client/src/pages/invite.tsx`
- **機能**: 招待受信UI、参加/辞退処理
- **ルート**: `/invite/:token`

### 3. Call Controls
- **更新**: 招待ボタンを追加
- **アイコン**: UserPlus

## セキュリティ機能

### 1. トークンベース認証
- 32バイトのランダムトークンを生成
- URLパスで安全に送信

### 2. 有効期限管理
- 招待に有効期限を設定
- 期限切れの招待は自動的に無効化

### 3. ステータス管理
- 一度応答した招待は再利用不可
- 各招待の状態を詳細に追跡

## 使用方法

### 招待を送信する
1. ミーティング中に招待ボタン（UserPlus アイコン）をクリック
2. 招待したい人のメールアドレスを入力
3. 必要に応じて表示名を入力
4. 「招待を送信」ボタンをクリック
5. 生成された招待リンクをコピーして相手に送信

### 招待を受け取る
1. 招待リンクをクリック
2. 招待情報を確認
3. 参加時の表示名を入力
4. 「ミーティングに参加」をクリック
5. 自動的にミーティングルームにリダイレクト

## 今後の拡張予定

### 1. メール通知
- SMTP統合による自動メール送信
- カスタムメールテンプレート

### 2. 招待権限管理
- ホストのみ招待可能
- 参加者の招待権限設定

### 3. 一括招待
- 複数のメールアドレスに一括招待
- CSVファイルからのインポート

### 4. 招待分析
- 招待の開封率、参加率の統計
- ダッシュボードでの可視化

## トラブルシューティング

### よくある問題

#### 1. 招待リンクが無効
- 有効期限切れを確認
- トークンの正確性を確認
- サーバーログでエラーを確認

#### 2. 招待が送信できない
- ネットワーク接続を確認
- サーバーのAPI応答を確認
- ブラウザのコンソールエラーを確認

#### 3. 参加時にエラー
- 表示名の入力を確認
- ルームの存在を確認
- WebRTC機能の有効性を確認

## 開発者向け情報

### ファイル構成
```
server/
├── routes.ts          # 招待API エンドポイント
├── storage.ts         # 招待データアクセス層
└── db.ts             # データベース接続

client/src/
├── components/
│   └── invite-modal.tsx    # 招待送信モーダル
├── pages/
│   └── invite.tsx          # 招待受信ページ
└── App.tsx                 # ルート定義

shared/
└── schema.ts              # 招待データスキーマ

migrations/
└── 0002_add_invitations.sql # 招待テーブル作成
```

### 設定項目
- 招待有効期限: デフォルト24時間
- トークン長: 32バイト（64文字）
- 最大招待数: 無制限（将来的に制限予定）

## 結論

この招待機能により、MeetSonarのユーザーは簡単に他の人をミーティングに招待できるようになりました。セキュアで使いやすいインターフェースにより、ビデオ会議の参加者管理が大幅に改善されます。
