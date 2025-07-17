# MeetSonar Docker開発環境

このプロジェクトはDocker Composeを使用して完全な開発環境を提供します。

## 前提条件

- Docker および Docker Compose がインストールされていること
- Make (オプション、便利なコマンドのため)

## クイックスタート

### 1. 環境変数の設定

```bash
cp .env.example .env
```

### 2. サービスの起動

```bash
# Makeを使用する場合
make up

# または直接docker-composeを使用
docker-compose up -d
```

### 3. ファイル変更の自動反映 (Watch モード)

```bash
# Makeを使用する場合
make up-watch

# または直接docker-composeを使用
docker-compose watch
```

## アクセス

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:5000
- **PostgreSQL**: localhost:5432 (ユーザー: meetsonar, パスワード: meetsonar_dev_password)

## 便利なコマンド

### サービス管理

```bash
# 全サービスを起動
make up

# サービスを停止
make down

# ログを確認
make logs

# 特定のサービスのログを確認
make logs-f  # フロントエンド
make logs-b  # バックエンド
make logs-db # データベース
```

### 開発用シェル接続

```bash
# バックエンドコンテナに接続
make shell-backend

# フロントエンドコンテナに接続
make shell-frontend

# データベースに接続
make shell-db
```

### データベース操作

```bash
# データベースマイグレーション
make db-migrate

# スキーマをプッシュ
make db-push

# Drizzle Studioを起動 (データベース管理UI)
make db-studio
```

### トラブルシューティング

```bash
# 全体を再ビルド
make rebuild

# 完全クリーンアップ
make clean

# 軽いクリーンアップ
make clean-soft
```

## サービス構成

### フロントエンド (React + Vite)
- **ポート**: 5173
- **ホットリロード**: 有効
- **プロキシ**: バックエンドAPIへの自動プロキシ

### バックエンド (Node.js + Express)
- **ポート**: 5000
- **ホットリロード**: tsx watch モード
- **WebSocket**: 対応

### データベース (PostgreSQL)
- **ポート**: 5432
- **永続化**: Docker volumeを使用
- **初期化**: 自動実行

## ファイル変更の反映

Docker Compose Watch機能により、以下のファイル変更が自動的に反映されます：

- `client/src/` - フロントエンドのソースコード
- `server/` - バックエンドのソースコード  
- `shared/` - 共有スキーマ
- `package.json` - 依存関係の変更時は自動再ビルド

## 本番環境への準備

開発が完了したら、以下のコマンドで本番用のビルドを作成できます：

```bash
# フロントエンドビルド
docker-compose exec frontend npm run build:client

# バックエンドビルド
docker-compose exec backend npm run build
```

## トラブルシューティング

### ポートが既に使用されている場合

```bash
# 使用中のポートを確認
sudo lsof -i :5173
sudo lsof -i :5000
sudo lsof -i :5432

# 必要に応じてdocker-compose.ymlのポート設定を変更
```

### データベース接続エラー

```bash
# データベースの状態を確認
make logs-db

# データベースコンテナの再起動
docker-compose restart postgres
```

### キャッシュ問題

```bash
# Node.jsキャッシュをクリア
docker-compose exec backend npm cache clean --force
docker-compose exec frontend npm cache clean --force

# 完全な再ビルド
make rebuild
```
