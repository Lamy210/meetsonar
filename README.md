# MeetSonar

🎥 **リアルタイムビデオ通話アプリケーション** - WebRTCベースのプロフェッショナル会議プラットフォーム

### 💬 チャット機能
- **リアルタイムメッセージング** - WebSocket使用のリアルタイムチャット
- **メッセージ履歴** - SQLiteによる永続化
- **システム通知** - 参加・退出の自動通知
- **自動スクロール** - 新着メッセージの自動追跡

![MeetSonar Demo](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Preact](https://img.shields.io/badge/Preact-10+-purple)
![WebRTC](https://img.shields.io/badge/WebRTC-Enabled-orange)

## 📋 概要

MeetSonarは、現代的なビデオ会議のニーズに応えるWebRTCベースのリアルタイム通話プラットフォームです。高品質な音声・ビデオ通話、画面共有、チャット機能、そして柔軟な招待システムを提供します。

## ✨ 主要機能

### 🎥 ビデオ通話機能
- **WebRTC P2P通信** - ブラウザ間直接接続による低遅延通話
- **メディアストリーム管理** - カメラ・マイクのON/OFF制御
- **画面共有** - getDisplayMedia API使用のデスクトップ共有
- **通話録画** - MediaRecorder API使用のローカル録画・ダウンロード
- **アダプティブ品質** - ネットワーク状況に応じた自動調整

### 👥 参加者管理
- **リアルタイム参加者表示** - WebSocket経由の状態同期
- **動的参加・退出** - 通話中の参加者変更リアルタイム対応
- **メディア状態表示** - 各参加者の音声・ビデオ状態可視化

### � チャット機能
- **リアルタイムチャット** - 通話中のテキストメッセージ
- **自動スクロール** - 新着メッセージの自動追跡
- **参加通知** - 参加者の入退室通知

### 📧 招待システム
- **トークンベース招待** - データベース管理の安全な招待トークン
- **URL招待** - クエリパラメータ経由の直接参加リンク
- **事前設定** - 招待者情報と参加者名の事前入力
- **有効期限管理** - 招待の時間制限機能

### ⚙️ メディア設定
- **デバイス検出** - navigator.mediaDevices.enumerateDevices() 使用
- **デバイス選択** - カメラ・マイク・スピーカーの動的切り替え
- **設定永続化** - localStorage使用の設定保存
- **プレビュー機能** - 設定前のメディアストリームテスト

### 🎨 ユーザーインターフェース
- **レスポンシブデザイン** - Tailwind CSS使用のモバイル対応
- **ダークテーマ** - CSS変数ベースのテーマシステム
- **アクセシビリティ** - Radix UIコンポーネント使用
- **リアルタイム状態表示** - WebSocketによる状態同期

## 🛠️ 技術スタック

### フロントエンド
- **Preact 10** - 軽量UIライブラリ（React互換）
- **TypeScript** - 型安全性
- **Vite** - 開発・ビルドツール
- **Tailwind CSS** - CSSフレームワーク
- **Radix UI** - アクセシブルなUIコンポーネント
- **Wouter** - 軽量クライアントサイドルーティング
- **SWR** - 軽量サーバー状態管理
- **WebRTC API** - ブラウザネイティブのリアルタイム通信
- **Lucide React** - アイコンライブラリ

### バックエンド
- **Bun** - JavaScript/TypeScriptランタイム（開発）
- **Node.js HTTP Server** - createServer() + Socket.IO統合
- **Socket.IO** - リアルタイム双方向通信
- **Drizzle ORM** - 型安全データベースORM
- **SQLite** - 軽量データベース（WALモード）
- **Zod** - スキーマバリデーション

### 開発・ビルドツール
- **Vite** - フロントエンドビルドツール
- **TypeScript** - 型システム
- **ESBuild** - 高速バンドラー（Vite内蔵）
- **Playwright** - E2Eテストフレームワーク
- **Docker** - コンテナ化
- **Drizzle Kit** - データベースマイグレーション

## 🚀 クイックスタート

### Docker開発環境（推奨）

最も簡単な方法はDockerを使用することです：

```bash
# リポジトリをクローン
git clone https://github.com/your-username/meetsonar.git
cd meetsonar

# 環境変数を設定
cp .env.example .env

# 全サービスを起動
make up

# または watch モードで起動（ファイル変更の自動反映）
make up-watch
```

**アクセスURL:**
- 🌐 **フロントエンド**: http://localhost:5173
- 🔧 **バックエンドAPI**: http://localhost:5000
- 🗄️ **SQLite DB**: data/meetsonar.db
- 📦 **Redis**: localhost:6379

詳細なDocker設定については [README-DOCKER.md](./README-DOCKER.md) を参照してください。

### ローカル開発環境

SQLiteを使用したシンプルな開発環境：

```bash
# リポジトリをクローン
git clone https://github.com/your-username/meetsonar.git
cd meetsonar

# 依存関係をインストール
bun install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してデータベース設定等を入力

# データベースをセットアップ
bun run db:push

# 開発サーバー起動
bun run dev
```

### 手書きDB開発モード

PostgreSQLなしで簡単に開発を始められます：

```bash
# 開発サーバー起動（手書きDBモード）
bun run dev:verbose

# アクセス: http://localhost:5173
```

## 📖 使用方法

### 基本的な流れ

1. **ロビーページ** (`/`)
   - 表示名を入力
   - 新しい会議を作成 または 既存の会議に参加

2. **会議ルーム** (`/room/:roomId`)
   - ビデオ・音声のON/OFF
   - 画面共有
   - チャット
   - 招待機能

3. **招待システム**
   - メール招待（トークンベース）
   - URL招待（直接リンク共有）

### 招待システムの使用方法

#### URL招待（推奨）

1. **ロビーページ**から「サンプルURL招待を生成」
2. 生成されたURLを相手に共有
3. 相手は URL をクリックして直接参加

#### メール招待

1. **会議ルーム**で「招待」ボタンをクリック
2. 相手のメールアドレスを入力
3. 招待を送信（開発環境ではトークンが生成される）
4. 相手は `/invite/:token` でアクセス

詳細な招待システムの使用方法は以下のドキュメントを参照：
- [招待システムガイド](./docs/INVITATION_SYSTEM_GUIDE.md)
- [URL招待ガイド](./docs/URL_INVITATION_GUIDE.md)

## 🎯 主要ページ・機能

### ページ構成

| ページ | URL | 説明 |
|--------|-----|------|
| ロビー | `/` | 会議の作成・参加 |
| 会議ルーム | `/room/:roomId` | メイン通話画面 |
| トークン招待 | `/invite/:token` | メール招待用ページ |
| URL招待 | `/join/:roomId` | URL招待用ページ |
| デバッグ | `/debug` | WebRTC診断 |
| WebSocket診断 | `/ws-diagnostics` | 接続診断 |

### コンポーネント構成

```
client/src/
├── components/
│   ├── ui/              # 基本UIコンポーネント
│   ├── call-controls.tsx # 通話コントロール
│   ├── invite-modal.tsx  # 招待モーダル
│   ├── settings-modal.tsx# 設定モーダル
│   ├── tab-chat.tsx     # チャット
│   └── video-grid.tsx   # ビデオグリッド
├── hooks/
│   ├── use-webrtc.tsx   # WebRTC管理
│   ├── use-websocket.tsx# WebSocket管理
│   ├── use-media-settings.tsx # メディア設定
│   └── use-toast.tsx    # 通知管理
└── pages/
    ├── lobby.tsx        # ロビーページ
    ├── call.tsx         # 通話ページ
    ├── invite.tsx       # 招待ページ
    └── join.tsx         # 参加ページ
```

## 🔌 API リファレンス

### REST API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/` | GET | API状態確認 |
| `/api/invitations` | POST | 招待作成 |
| `/api/invitations/:token` | GET | 招待情報取得 |
| `/api/invitations/:token/respond` | POST | 招待への応答 |

### WebSocket イベント

| イベント | 説明 |
|---------|------|
| `join-room` | ルーム参加 |
| `leave-room` | ルーム退出 |
| `webrtc-offer` | WebRTC オファー |
| `webrtc-answer` | WebRTC アンサー |
| `ice-candidate` | ICE候補 |
| `chat-message` | チャットメッセージ |
| `participant-joined` | 参加者参加通知 |
| `participant-left` | 参加者退出通知 |

詳細なAPI仕様は [MEDIA_SETTINGS_API_REFERENCE.md](./docs/MEDIA_SETTINGS_API_REFERENCE.md) を参照してください。

## 🧪 テスト

### E2Eテスト

```bash
# Playwrightテストの実行
bun run test:e2e

# 特定のテストスイート
bun run test:websocket
bun run test:multi-user
```

### 手動テスト

```bash
# WebSocket接続テスト
bun run ws-test            # WebSocket直接テスト

# 特定機能テスト
bun run test:chat          # チャット機能テスト
bun run test:websocket     # WebSocketテスト
bun run test:api           # APIテスト
```

テスト詳細は [TESTING.md](./TESTING.md) を参照してください。

## 📊 パフォーマンス

パフォーマンス分析結果は [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) で確認できます。

主要な最適化：
- WebRTC接続の効率化
- メディアストリーム管理の改善
- UIレンダリングの最適化
- メモリ使用量の削減

## 🛠️ 開発スクリプト

### 基本コマンド

```bash
# 開発サーバー起動
bun run dev                 # サーバー起動（bun run server/index.ts）
bun run dev:node           # Node.js版サーバー起動
bun run dev:verbose        # 詳細ログ付き（DEBUG=vite:proxy bun run dev:client）
bun run dev:client         # フロントエンドのみ
bun run dev:ws-debug       # WebSocketデバッグモード

# ビルド
bun run build              # プロダクションビルド（Bun向け）
bun run build:node         # プロダクションビルド（Node.js向け）
bun run build:client       # フロントエンドビルド

# 実行
bun run start              # プロダクション実行（Bun版）
bun run start:node         # プロダクション実行（Node.js版）

# データベース
bun run db:push            # スキーマ適用
bun run db:migrate         # マイグレーション実行
bun run db:studio          # Drizzle Studio起動

# テスト
bun run test               # 全テスト実行
bun run test:e2e           # E2Eテスト
bun run test:unit          # ユニットテスト
bun run test:integration   # 統合テスト
bun run test:coverage      # カバレッジ付きテスト
bun run test:watch         # ウォッチモード

# 特定機能テスト
bun run test:chat          # チャット機能テスト
bun run test:websocket     # WebSocketテスト
bun run test:api           # APIテスト

# 型チェック
bun run check              # TypeScript型チェック

# Playwright
bun run playwright:install # Playwrightブラウザインストール
```

### Docker コマンド

```bash
# 基本操作
make up                   # サービス起動
make up-watch            # ファイル監視付き起動
make down                # サービス停止
make restart             # 再起動

# 開発用
make logs                # ログ表示
make shell               # コンテナシェル
make clean               # クリーンアップ

# データベース
make db-reset            # DB初期化
make db-migrate          # マイグレーション
```

## 📚 ドキュメント

### ユーザーガイド
- [招待システムガイド](./docs/INVITATION_SYSTEM_GUIDE.md) - 招待機能の使用方法
- [URL招待ガイド](./docs/URL_INVITATION_GUIDE.md) - URL招待の詳細
- [設定ユーザーガイド](./docs/SETTINGS_USER_GUIDE.md) - メディア設定の使用方法

### 技術ドキュメント
- [メディア設定技術仕様](./docs/MEDIA_SETTINGS_TECHNICAL_SPEC.md) - 技術詳細
- [メディア設定API参照](./docs/MEDIA_SETTINGS_API_REFERENCE.md) - API仕様
- [WebRTC実装ノート](./docs/use-webrtc-implementation-notes.md) - WebRTC実装詳細

### 開発ドキュメント
- [Docker開発ガイド](./README-DOCKER.md) - Docker環境の詳細
- [UI/UX改善実装](./docs/UI_UX_IMPROVEMENTS_IMPLEMENTATION.md) - UI改善の記録
- [チャット機能修正](./docs/CHAT_SCROLL_FIX.md) - チャット改善の記録

## 🌐 ブラウザサポート

| ブラウザ | バージョン | WebRTC | 画面共有 | 備考 |
|---------|----------|--------|----------|------|
| Chrome | 88+ | ✅ | ✅ | 推奨 |
| Firefox | 85+ | ✅ | ✅ | フル対応 |
| Safari | 14+ | ✅ | ⚠️ | 制限あり |
| Edge | 88+ | ✅ | ✅ | Chromiumベース |

⚠️ Safari: 画面共有に一部制限があります

## 🚀 デプロイ

### プロダクション環境

```bash
# ビルド
bun run build

# 環境変数設定
export DATABASE_URL="postgresql://..."
export NODE_ENV="production"

# 起動
bun run start
```

### Docker プロダクション

```bash
# プロダクションイメージビルド
docker build -t meetsonar:latest .

# 起動
docker run -p 3000:3000 -e DATABASE_URL="..." meetsonar:latest
```

## 🤝 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン

- TypeScriptの型安全性を維持
- ESLint・Prettierの設定に従う
- テストの追加を推奨
- コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)に従う

## 📄 ライセンス

このプロジェクトは [MIT License](LICENSE) の下で公開されています。

## 🆘 サポート・トラブルシューティング

### よくある問題

**WebRTC接続エラー**
- ブラウザがWebRTCに対応しているか確認
- HTTPSまたはlocalhostでアクセスしているか確認
- ファイアウォール設定を確認

**メディアデバイスエラー**
- ブラウザにカメラ・マイクの許可を与えているか確認
- 他のアプリケーションがデバイスを使用していないか確認

**招待リンクが機能しない**
- URLパラメータが正しく設定されているか確認
- 招待の有効期限が切れていないか確認

### サポート

問題や質問がある場合：
1. [Issues](https://github.com/your-username/meetsonar/issues) で既存の問題を検索
2. 新しいIssueを作成（バグレポート・機能要求）
3. [Discussions](https://github.com/your-username/meetsonar/discussions) で議論

---

## 🎉 謝辞

MeetSonarを使用していただき、ありがとうございます！

このプロジェクトは以下の素晴らしいオープンソースプロジェクトによって実現されています：
- [React](https://reactjs.org/)
- [WebRTC](https://webrtc.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- その他多くのコントリビューター

**開発チーム** 🚀
- メンテナー: [Your Name](https://github.com/your-username)
- コントリビューター: [Contributors](https://github.com/your-username/meetsonar/contributors)

---

[![GitHub stars](https://img.shields.io/github/stars/your-username/meetsonar?style=social)](https://github.com/your-username/meetsonar)
[![GitHub forks](https://img.shields.io/github/forks/your-username/meetsonar?style=social)](https://github.com/your-username/meetsonar)
[![GitHub issues](https://img.shields.io/github/issues/your-username/meetsonar)](https://github.com/your-username/meetsonar/issues)
[![GitHub license](https://img.shields.io/github/license/your-username/meetsonar)](https://github.com/your-username/meetsonar/blob/main/LICENSE)
