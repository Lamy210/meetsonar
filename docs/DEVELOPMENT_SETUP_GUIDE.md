# 🚀 開発環境設定ガイド

MeetSonarの開発環境を効率的にセットアップするための完全ガイドです。

## 📋 前提条件

### 必須ツール
- **Bun** - JavaScript/TypeScriptランタイム（推奨・メイン）
  ```bash
  curl -fsSL https://bun.sh/install | bash
  ```
- **Node.js** - v18以上（Bunの代替として利用可能）
- **Docker & Docker Compose** - コンテナ化開発環境
- **Git** - バージョン管理

> 💡 **注意**: このプロジェクトはBunをメインランタイムとして設計されていますが、Node.jsでも動作します。package.jsonには両方のスクリプトが用意されています。

### 推奨ツール
- **VS Code** - エディタ（拡張機能設定済み）
- **PostgreSQL** - ローカルデータベース（オプション）
- **Make** - タスクランナー

## 🏗️ セットアップ方法

### Option 1: Docker開発環境（推奨）

最も簡単で確実な方法です：

```bash
# 1. リポジトリクローン
git clone https://github.com/your-username/meetsonar.git
cd meetsonar

# 2. 環境変数設定
cp .env.example .env
# .envファイルを必要に応じて編集

# 3. 全サービス起動
make up-watch

# アクセス確認
# フロントエンド: http://localhost:5173
# バックエンド: http://localhost:5000
# PostgreSQL: localhost:5432
```

#### Docker開発のメリット
- ✅ 環境構築が簡単
- ✅ チーム間での環境統一
- ✅ PostgreSQLも自動セットアップ
- ✅ ホットリロード対応

### Option 2: ローカル開発環境

Dockerを使わない場合：

```bash
# 1. リポジトリクローン
git clone https://github.com/your-username/meetsonar.git
cd meetsonar

# 2. 依存関係インストール
bun install

# 3. 環境変数設定
cp .env.example .env
# DATABASE_URLなどを設定

# 4. データベースセットアップ（PostgreSQL使用時）
bun run db:push

# 5. 開発サーバー起動
bun run dev:verbose
```

### Option 3: 手書きDB開発（最速）

データベース不要の開発モード：

```bash
# 1-2. 同上

# 3. 開発サーバー起動（手書きDBモード）
bun run dev:verbose

# データベース設定不要で即座に開発開始
```

## ⚙️ 環境変数設定

### `.env` ファイル設定

```bash
# データベース設定
DATABASE_URL="postgresql://user:password@localhost:5432/meetsonar"

# 開発モード設定
NODE_ENV="development"
VITE_API_URL="http://localhost:5000"

# WebSocket設定
WS_PORT=5000

# セキュリティ（本番環境では必ず変更）
JWT_SECRET="your-secret-key"
```

### Docker環境での設定

```yaml
# docker-compose.ymlで自動設定される項目
environment:
  - DATABASE_URL=postgresql://postgres:password@postgres:5432/meetsonar
  - NODE_ENV=development
  - VITE_API_URL=http://localhost:5000
```

## 🛠️ 開発コマンド一覧

### 基本的な開発フロー

```bash
# 開発サーバー起動（Bun - 推奨）
bun run dev                 # バックエンド（bun run server/index.ts）
bun run dev:client         # フロントエンドのみ
bun run dev:verbose        # 詳細ログ付き（DEBUG=vite:proxy bun run dev:client）

# Node.js代替版
bun run dev:node           # バックエンド（NODE_ENV=development tsx server/index.ts）

# ビルド確認（Bun - 推奨）
bun run build              # プロダクションビルド（vite build && bun build server/index.ts）
bun run build:client       # フロントエンドビルド

# Node.js代替版
bun run build:node         # Node.js向けビルド

# 型チェック
bun run check              # TypeScript型チェック（tsc）
```

### データベース操作

```bash
# スキーマ管理
bun run db:push            # スキーマをDBに適用
bun run db:generate        # マイグレーションファイル生成
bun run db:migrate         # マイグレーション実行

# 開発ツール
bun run db:studio          # Drizzle Studio起動
bun run db:reset           # データベースリセット
```

### テスト実行

```bash
# E2Eテスト
bun run test:e2e           # Playwrightテスト（bunx playwright test）
bun run test:chat          # チャット機能テスト
bun run test:websocket     # WebSocketテスト
bun run test:api           # APIテスト

# 単体・統合テスト
bun run test               # 全テスト（bun test）
bun run test:unit          # ユニットテスト
bun run test:integration   # 統合テスト
bun run test:coverage      # カバレッジ付きテスト
bun run test:watch         # ウォッチモード

# Playwright設定
bun run playwright:install # Playwright環境セットアップ
```

### Docker操作

```bash
# 基本操作
make up                    # サービス起動
make up-watch             # ファイル監視付き起動
make down                 # サービス停止
make restart              # 再起動

# 開発支援
make logs                 # ログ表示
make shell                # コンテナ内シェル
make clean                # クリーンアップ

# データベース
make db-reset             # データベース初期化
make db-migrate           # マイグレーション実行
```

## 🎯 開発ワークフロー

### 典型的な開発の流れ

1. **環境起動**
   ```bash
   make up-watch  # Docker環境
   # または
   bun run dev:verbose  # ローカル環境
   ```

2. **機能開発**
   - フロントエンド: `client/src/` 内のファイルを編集
   - バックエンド: `server/` 内のファイルを編集
   - 共有型: `shared/` 内のスキーマを編集

3. **テスト**
   ```bash
   bun run test:e2e  # 機能テスト
   bun run check     # 型チェック
   ```

4. **ビルド確認**
   ```bash
   bun run build  # プロダクションビルド
   ```

### ブランチ戦略

```bash
# 機能開発
git checkout -b feature/new-feature
# 開発・テスト
git commit -m "feat: add new feature"
git push origin feature/new-feature
# プルリクエスト作成

# バグ修正
git checkout -b fix/bug-description
# 修正・テスト
git commit -m "fix: resolve bug description"
```

## 🔧 VS Code設定

### 推奨拡張機能

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "ms-vscode.vscode-json"
  ]
}
```

### ワークスペース設定

プロジェクトには `.vscode/settings.json` が含まれており、以下を自動設定：
- Tailwind CSS警告の抑制
- TypeScriptの型チェック
- Prettierフォーマット

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. Bunインストールエラー
```bash
# Bunが見つからない場合
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # または ~/.zshrc

# 権限エラーの場合
sudo chown -R $(whoami) ~/.bun
```

#### 2. Dockerコンテナが起動しない
```bash
# Dockerサービス確認
docker --version
docker-compose --version

# ポート競合の確認
netstat -tulpn | grep :5173  # フロントエンド
netstat -tulpn | grep :5000  # バックエンド
netstat -tulpn | grep :5432  # PostgreSQL

# クリーンアップして再起動
make clean
make up
```

#### 3. データベース接続エラー
```bash
# PostgreSQL接続確認
psql -h localhost -p 5432 -U postgres -d meetsonar

# Docker内でのDB状態確認
docker-compose exec postgres psql -U postgres -d meetsonar

# マイグレーションの再実行
bun run db:push
```

#### 4. WebRTC接続エラー
```bash
# HTTPS/localhost確認
echo $VITE_API_URL

# ブラウザコンソールでエラー確認
# Chrome: F12 → Console
# Firefox: F12 → Console
```

#### 5. 型エラー
```bash
# TypeScript型チェック
bun run check

# node_modules再インストール
rm -rf node_modules bun.lock
bun install
```

#### 6. ビルドエラー
```bash
# キャッシュクリア
rm -rf dist .vite
bun run build

# 依存関係確認
bun run check
```

### デバッグツール

#### WebRTC診断
```bash
# ブラウザで診断ページにアクセス
http://localhost:5173/debug
http://localhost:5173/ws-diagnostics
```

#### ログ確認
```bash
# Docker環境
make logs

# ローカル環境
bun run dev:verbose  # 詳細ログ出力
```

## 📊 パフォーマンス最適化

### 開発環境での最適化

```bash
# Viteのキャッシュ利用
# 初回起動後は高速化される

# Bunの高速パッケージ管理
bun install  # npmより高速

# Docker BuildKitの利用
export DOCKER_BUILDKIT=1
```

### ホットリロード設定

```javascript
// vite.config.ts での設定
export default defineConfig({
  server: {
    hmr: {
      overlay: false  // エラーオーバーレイを無効化
    }
  }
})
```

## 🎉 開発開始チェックリスト

- [ ] BunまたはNode.jsのインストール
- [ ] Dockerのインストール（Docker使用時）
- [ ] プロジェクトのクローン
- [ ] `.env`ファイルの設定
- [ ] 開発サーバーの起動確認
- [ ] ブラウザでのアクセス確認
- [ ] WebRTC機能のテスト
- [ ] 招待システムのテスト
- [ ] VS Code拡張機能のインストール

## 📞 サポート

開発環境で問題が発生した場合：

1. **よくある問題**を確認
2. **デバッグツール**を使用
3. **ログ**を確認
4. [Issues](https://github.com/your-username/meetsonar/issues)で報告

---

これで効率的な開発環境が構築できます！ 🚀
