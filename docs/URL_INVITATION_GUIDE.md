# URL招待機能ガイド

## 概要

MeetSonarのURL招待機能は、クエリパラメータを使用して招待情報を事前設定し、スムーズな参加体験を提供する機能です。

## 機能概要

### 1. URL招待とは
- URLクエリパラメータに招待情報を含めることで、受信者の参加プロセスを簡素化
- 招待者情報、表示名、メールアドレスなどを事前設定
- `/join/:roomId` エンドポイントで処理

### 2. 主な特徴
- **簡単共有**: URLをコピーして任意の方法で共有
- **事前設定**: 招待される人の情報をURLパラメータで事前設定
- **自動入力**: 参加時に招待情報から表示名を自動設定
- **有効期限**: パラメータで有効期限を設定可能（表示のみ）

## URL構造

### 基本形式
```
http://localhost:5173/join/{roomId}?[parameters]
```

### 実装されているパラメータ

| パラメータ | 処理 | 実装状況 | 例 |
|----------|------|----------|-----|
| `inviter` | 招待者の表示名表示 | ✅ 実装済み | `inviter=田中太郎` |
| `from` | 招待者の表示名（`inviter`の別名） | ✅ 実装済み | `from=田中太郎` |
| `name` | 表示名の事前入力 | ✅ 実装済み | `name=佐藤花子` |
| `displayName` | 表示名の事前入力（`name`の別名） | ✅ 実装済み | `displayName=佐藤花子` |
| `email` | メールアドレス表示・名前推測 | ✅ 実装済み | `email=user@example.com` |
| `expires` | 有効期限表示 | ✅ 実装済み | `expires=2025-07-25T10:00:00Z` |
| `message` | カスタムメッセージ | ✅ 実装済み | `message=会議に参加してください` |

### 実際のURL例
```
http://localhost:5173/join/room123?inviter=田中太郎&email=user@example.com&name=佐藤花子&expires=2025-07-25T10:00:00Z
```

## 使用方法

### 1. 招待モーダルからURL招待を生成

1. ミーティング中に招待ボタンをクリック
2. 「URL招待リンク生成」セクションで以下を入力：
   - 招待される方のメールアドレス (オプション)
   - 招待される方の表示名 (オプション)
3. 「URL招待リンクをコピー」ボタンをクリック
4. 生成されたURLを任意の方法で共有

### 2. 手動でURL構築

```javascript
const baseUrl = `https://meetsonar.example.com/join/${roomId}`;
const params = new URLSearchParams();

params.set('inviter', '招待者名');
params.set('email', 'invitee@example.com');
params.set('name', '招待される人の名前');

// 24時間後の有効期限
const expiry = new Date();
expiry.setHours(expiry.getHours() + 24);
params.set('expires', expiry.toISOString());

const inviteUrl = `${baseUrl}?${params.toString()}`;
```

### 3. 招待を受け取る側の体験

1. 招待URLをクリック
2. 専用の参加ページが表示
3. 招待情報（招待者、ルーム名等）を確認
4. 表示名が事前設定されている（変更可能）
5. 「ミーティングに参加」をクリックで直接参加

## 技術仕様

### フロントエンド

#### 新しいコンポーネント
- **JoinPage** (`/client/src/pages/join.tsx`)
  - URL招待専用の参加ページ
  - パラメータ解析と表示
  - 有効期限チェック

#### 更新されたコンポーネント
- **InviteModal** (`/client/src/components/invite-modal.tsx`)
  - URL招待リンク生成機能を追加
  - UI統合とユーザビリティ向上

- **Call** (`/client/src/pages/call.tsx`)
  - 招待情報の処理と保存
  - ウェルカムメッセージの自動送信

#### ルーティング
```tsx
<Route path="/join/:roomId" component={JoinPage} />
```

### URL パラメータ処理

```javascript
// URLパラメータの取得
const urlParams = new URLSearchParams(window.location.search);
const inviterName = urlParams.get("inviter");
const inviteeEmail = urlParams.get("email");
const suggestedName = urlParams.get("name");
const expiry = urlParams.get("expires");

// 有効期限チェック
const isExpired = expiry && new Date() > new Date(expiry);
```

### 自動ウェルカムメッセージ

```javascript
// 招待経由での参加を検出してウェルカムメッセージを送信
useEffect(() => {
  if (connectionStatus === 'connected' && invitedBy && sendChatMessage) {
    const welcomeMessage = `${displayName}さんが${invitedBy}さんの招待で参加しました 🎉`;
    setTimeout(() => {
      sendChatMessage(welcomeMessage);
    }, 2000);
  }
}, [connectionStatus, invitedBy, displayName, sendChatMessage]);
```

## セキュリティ考慮事項

### 1. 有効期限管理
- URLパラメータに有効期限を含める
- クライアントサイドで期限チェック
- 期限切れの場合は参加を拒否

### 2. パラメータ検証
- メールアドレス形式の検証
- 表示名の文字数制限
- 特殊文字のエスケープ

### 3. 情報漏洩対策
- URLに機密情報を含めない
- パラメータの適切なエンコーディング
- ログへの機密情報記録を避ける

## 利用シナリオ

### 1. ビジネス会議
```
https://meetsonar.example.com/join/weekly-meeting?inviter=田中部長&name=新入社員A&expires=2025-07-25T15:00:00Z
```

### 2. 家族・友人との通話
```
https://meetsonar.example.com/join/family-chat?inviter=お母さん&name=お父さん
```

### 3. 教育・セミナー
```
https://meetsonar.example.com/join/math-lesson?inviter=佐藤先生&email=student@school.jp&name=生徒A
```

## 今後の拡張予定

### 1. メッセージカスタマイズ
- `message`パラメータの実装
- リッチテキストメッセージ対応

### 2. 会議室設定
- 参加時の初期設定（ミュート状態等）
- 権限レベルの事前設定

### 3. 統計・分析
- URL招待の使用状況分析
- 参加率の追跡

### 4. セキュリティ強化
- URLトークンの追加
- IPアドレス制限
- 一時的な参加コード

## トラブルシューティング

### よくある問題

#### 1. パラメータが認識されない
- URL エンコーディングを確認
- パラメータ名のスペルを確認
- ブラウザの互換性を確認

#### 2. 有効期限エラー
- 日時形式がISO 8601準拠か確認
- タイムゾーンの設定を確認
- システム時計の同期を確認

#### 3. 表示名が設定されない
- パラメータの優先順位を確認
- localStorage の状態を確認
- デフォルト値の動作を確認

## 結論

URL招待機能により、MeetSonarはより柔軟で使いやすい招待システムを提供できるようになりました。従来のトークンベース招待と組み合わせることで、様々な利用シナリオに対応できます。

シンプルなURL共有から高度な事前設定まで、ユーザーのニーズに合わせた招待方法を選択できるため、ユーザー体験が大幅に向上します。
