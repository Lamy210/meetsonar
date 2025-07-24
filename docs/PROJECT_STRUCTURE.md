# 📁 プロジェクト構成

MeetSonarプロジェクトの詳細なファイル構成と各ディレクトリの役割について説明します。

## 📂 ルートディレクトリ

```
meetsonar/
├── 📁 .vscode/                # VS Code設定
│   └── settings.json          # ワークスペース設定
├── 📁 attached_assets/        # 添付ファイル・アセット
├── 📁 bin/                    # 実行可能ファイル
├── 📁 client/                 # フロントエンドコード
├── 📁 docker/                 # Docker設定ファイル
├── 📁 docs/                   # プロジェクトドキュメント
├── 📁 migrations/             # データベースマイグレーション
├── 📁 server/                 # バックエンドコード
├── 📁 shared/                 # 共有型定義・スキーマ
├── 📁 tests/                  # テストファイル
├── 📄 .env                    # 環境変数（ローカル）
├── 📄 .env.example            # 環境変数テンプレート
├── 📄 bun.lock                # Bun依存関係ロック
├── 📄 docker-compose.yml      # Docker Compose設定
├── 📄 drizzle.config.ts       # Drizzle ORM設定
├── 📄 justfile                # Justタスク定義
├── 📄 Makefile                # Make コマンド
├── 📄 package.json            # プロジェクト設定
├── 📄 playwright.config.ts    # Playwrightテスト設定
├── 📄 postcss.config.js       # PostCSS設定
├── 📄 README.md               # プロジェクト説明
├── 📄 tailwind.config.ts      # Tailwind CSS設定
├── 📄 tsconfig.json           # TypeScript設定
└── 📄 vite.config.ts          # Vite設定
```

## 🎨 フロントエンド (`/client`)

```
client/
├── 📄 index.html              # HTMLエントリーポイント
├── 📁 src/
│   ├── 📁 components/         # Reactコンポーネント
│   │   ├── 📁 ui/             # 基本UIコンポーネント
│   │   │   ├── badge.tsx      # バッジコンポーネント
│   │   │   ├── button.tsx     # ボタンコンポーネント
│   │   │   ├── card.tsx       # カードコンポーネント
│   │   │   ├── dialog.tsx     # モーダルダイアログ
│   │   │   ├── input.tsx      # 入力フィールド
│   │   │   ├── label.tsx      # ラベル
│   │   │   ├── select.tsx     # セレクトボックス
│   │   │   ├── switch.tsx     # スイッチ/トグル
│   │   │   ├── tabs.tsx       # タブコンポーネント
│   │   │   ├── toast.tsx      # 通知
│   │   │   └── tooltip.tsx    # ツールチップ
│   │   ├── call-controls.tsx  # 通話コントロール
│   │   ├── invite-modal.tsx   # 招待モーダル
│   │   ├── settings-modal.tsx # 設定モーダル
│   │   ├── tab-chat.tsx       # チャットタブ
│   │   ├── tab-participants.tsx # 参加者タブ
│   │   └── video-grid.tsx     # ビデオグリッド
│   ├── 📁 hooks/              # カスタムReactフック
│   │   ├── use-media-settings.tsx # メディア設定管理
│   │   ├── use-toast.tsx      # 通知管理
│   │   ├── use-webrtc.tsx     # WebRTC管理
│   │   └── use-websocket.tsx  # WebSocket管理
│   ├── 📁 lib/                # ユーティリティライブラリ
│   │   ├── queryClient.ts     # TanStack Query設定
│   │   └── utils.ts           # 汎用ユーティリティ
│   ├── 📁 pages/              # ページコンポーネント
│   │   ├── call.tsx           # 通話ページ
│   │   ├── debug.tsx          # WebRTCデバッグページ
│   │   ├── invite.tsx         # 招待ページ
│   │   ├── join.tsx           # 参加ページ（URL招待）
│   │   ├── lobby.tsx          # ロビーページ
│   │   ├── not-found.tsx      # 404ページ
│   │   └── websocket-diagnostics.tsx # WebSocket診断
│   ├── 📁 styles/             # スタイルファイル
│   │   └── viewport-fix.css   # ビューポート修正
│   ├── 📄 App.tsx             # メインアプリコンポーネント
│   ├── 📄 index.css           # グローバルスタイル
│   ├── 📄 main.tsx            # Reactエントリーポイント
│   └── 📄 vite-env.d.ts       # Vite型定義
└── 📄 components.json         # shadcn/ui設定
```

## 🔧 バックエンド (`/server`)

```
server/
├── 📄 index.ts                # サーバーエントリーポイント
├── 📄 db.ts                   # データベース接続設定
├── 📄 rate-limiter.ts         # レート制限
├── 📄 routes.ts               # API ルート定義
├── 📄 storage.ts              # データストレージ管理
├── 📄 talk-storage.ts         # 通話データ管理
├── 📄 utils.ts                # サーバーユーティリティ
├── 📄 vite.ts                 # Vite統合
├── 📄 websocket-handler.ts    # WebSocket処理
└── 📁 lib/                    # サーバーライブラリ
```

## 🤝 共有モジュール (`/shared`)

```
shared/
├── 📄 schema.ts               # メインデータベーススキーマ
├── 📄 schema.ts.backup        # スキーマバックアップ
├── 📄 talk-schema.ts          # 通話関連スキーマ
├── 📄 talk-schema.ts.backup   # 通話スキーマバックアップ
└── 📄 unified-schema.ts       # 統合スキーマ
```

## 🗃️ データベース (`/migrations`)

```
migrations/
├── 📄 0000_aromatic_dust.sql  # 初期マイグレーション
├── 📄 0001_add_chat_messages.sql # チャット機能追加
├── 📄 0002_add_invitations.sql   # 招待システム追加
└── 📁 meta/                   # マイグレーションメタデータ
    ├── _journal.json          # マイグレーション履歴
    ├── 0000_snapshot.json     # 初期スナップショット
    ├── 0001_snapshot.json     # チャット追加後
    └── 0002_snapshot.json     # 招待追加後
```

## 🧪 テスト (`/tests`)

```
tests/
├── 📄 complete-system-test.js # システム全体テスト
├── 📄 test-multi-user.js      # マルチユーザーテスト
├── 📄 test-server.js          # サーバーテスト
├── 📄 test-websocket-direct.js # WebSocket直接テスト
├── 📄 websocket-test.js       # WebSocketテスト
├── 📄 create_test_db.js       # テストDB作成
└── 📄 run-tests.sh            # テスト実行スクリプト
```

## 📚 ドキュメント (`/docs`)

```
docs/
├── 📄 INVITATION_SYSTEM_GUIDE.md        # 招待システムガイド
├── 📄 URL_INVITATION_GUIDE.md           # URL招待ガイド
├── 📄 MEDIA_DEVICE_SETTINGS_COMPLETE_GUIDE.md # メディア設定完全ガイド
├── 📄 MEDIA_DEVICE_SETTINGS.md          # メディア設定基本
├── 📄 MEDIA_SETTINGS_API_REFERENCE.md   # メディア設定API
├── 📄 MEDIA_SETTINGS_TECHNICAL_SPEC.md  # メディア設定技術仕様
├── 📄 SETTINGS_USER_GUIDE.md            # 設定ユーザーガイド
├── 📄 UI_UX_IMPROVEMENTS_IMPLEMENTATION.md # UI/UX改善実装
├── 📄 UI,UX_20250725.md                 # UI/UX更新記録
├── 📄 CHAT_SCROLL_FIX.md                # チャットスクロール修正
├── 📄 CHAT_ADDITIONAL_FIXES.md          # チャット追加修正
├── 📄 FINAL_SCROLL_IMPROVEMENTS.md      # 最終スクロール改善
├── 📄 use-webrtc-implementation-notes.md # WebRTC実装ノート
├── 📄 chat-flow-diagram.md              # チャットフロー図
├── 📄 Claudeのchatブランチマージ後の指摘_2025-07-25.md
└── 📄 Claudeのwebsocketブランチ開発中に入ったレビュー.md
```

## 🐳 Docker (`/docker`)

```
docker/
├── 📁 backend/                # バックエンドDockerfile
├── 📁 frontend/               # フロントエンドDockerfile
└── 📁 postgres/               # PostgreSQL設定
```

## 🔧 設定ファイル詳細

### パッケージ管理
- `package.json` - プロジェクト依存関係とスクリプト
- `bun.lock` - Bunによる依存関係ロック

### ビルド・開発ツール
- `vite.config.ts` - Vite設定（フロントエンド）
- `tsconfig.json` - TypeScript設定
- `tailwind.config.ts` - Tailwind CSS設定
- `postcss.config.js` - PostCSS設定

### データベース
- `drizzle.config.ts` - Drizzle ORM設定
- `.env` - データベース接続情報等

### コンテナ化
- `docker-compose.yml` - 全サービスの定義
- `Dockerfile` - アプリケーションイメージ

### テスト
- `playwright.config.ts` - E2Eテスト設定

### タスクランナー
- `Makefile` - Make コマンド定義
- `justfile` - Just タスク定義

## 📝 重要なファイルの役割

### コアファイル

| ファイル | 役割 |
|---------|------|
| `client/src/App.tsx` | フロントエンドのメインコンポーネント |
| `server/index.ts` | バックエンドのエントリーポイント |
| `shared/schema.ts` | データベーススキーマ定義 |
| `client/src/hooks/use-webrtc.tsx` | WebRTC通信管理 |
| `server/websocket-handler.ts` | WebSocket通信処理 |

### 設定ファイル

| ファイル | 役割 |
|---------|------|
| `vite.config.ts` | Viteビルド設定 |
| `docker-compose.yml` | 開発環境構成 |
| `drizzle.config.ts` | データベースORM設定 |
| `tailwind.config.ts` | UIスタイル設定 |

### ドキュメント

| ファイル | 役割 |
|---------|------|
| `README.md` | プロジェクト全体説明 |
| `docs/INVITATION_SYSTEM_GUIDE.md` | 招待機能ガイド |
| `docs/MEDIA_DEVICE_SETTINGS_COMPLETE_GUIDE.md` | メディア設定ガイド |

## 🚀 開発の始め方

1. **プロジェクトクローン**
   ```bash
   git clone [repository-url]
   cd meetsonar
   ```

2. **設定ファイル確認**
   - `.env.example` → `.env` への設定
   - `docker-compose.yml` の確認

3. **開発環境起動**
   ```bash
   make up-watch
   ```

4. **主要ファイルの理解**
   - `client/src/App.tsx` - フロントエンドルーティング
   - `server/index.ts` - バックエンドサーバー
   - `shared/schema.ts` - データベース構造

このファイル構成を理解することで、効率的な開発が可能になります。
