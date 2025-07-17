# MeetSonar

リアルタイムビデオ通話アプリケーション

## 概要

MeetSonarは、WebRTCを使用したモダンなビデオ通話プラットフォームです。リアルタイムでの音声・ビデオ通話、画面共有、参加者管理機能を提供します。

## 特徴

- 🎥 リアルタイムビデオ・音声通話
- 🖥️ 高品質画面共有機能
- 📹 通話録画・ダウンロード機能
- 👥 複数参加者サポート
- 📱 レスポンシブデザイン
- 🌙 ダークテーマ対応
- 🔒 セキュアな接続

## 技術スタック

## 技術スタック

### フロントエンド

- **React 18** - UIライブラリ
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Radix UI** - アクセシブルなコンポーネント
- **Wouter** - 軽量ルーティング
- **React Query** - データフェッチング
- **WebRTC** - リアルタイム通信

### バックエンド

- **Node.js** - サーバーランタイム
- **Express.js** - Webフレームワーク
- **WebSocket** - リアルタイム通信
- **Drizzle ORM** - データベースORM
- **PostgreSQL** - データベース

### 開発ツール
- **Vite** - ビルドツール
- **ESBuild** - 高速バンドル
- **TypeScript** - 型システム

## セットアップ

### 前提条件
- Node.js (v18以上)
- PostgreSQL
- npm または yarn

### インストール

#### Docker開発環境（推奨）

最も簡単な開発方法はDockerを使用することです：

1. リポジトリをクローン
```bash
git clone https://github.com/your-username/meetsonar.git
cd meetsonar
```

2. 環境変数を設定
```bash
cp .env.example .env
```

3. 全サービスの起動
```bash
make up

# または watch モードで起動（ファイル変更の自動反映）
make up-watch
```

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:5000
- **PostgreSQL**: localhost:5432

詳細は [README-DOCKER.md](./README-DOCKER.md) を参照してください。

#### ローカル開発環境

Dockerを使用しない場合のセットアップ：

1. リポジトリをクローン
```bash
git clone https://github.com/your-username/meetsonar.git
cd meetsonar
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp .env.example .env
```

必要な環境変数を `.env` ファイルに設定してください：
```
DATABASE_URL=postgresql://username:password@localhost:5432/meetsonar
```

4. データベースをセットアップ
```bash
npm run db:push
```

### 開発サーバー起動

**Docker使用時:**
```bash
make up-watch  # ファイル変更の自動反映
```

**ローカル開発時:**
```bash
npm run dev
```

アプリケーションは `http://localhost:5173` (Docker) または `http://localhost:5000` (ローカル) で起動します。

### プロダクションビルド

```bash
npm run build
npm start
```

## 使用方法

1. **ロビーページ**: トップページで部屋名を入力してビデオ通話を開始
2. **通話ページ**: ビデオ・音声の切り替え、画面共有、参加者管理
3. **招待機能**: 他の参加者を通話に招待

## 主要機能

### ビデオ通話
- 高品質なビデオ・音声通話
- 自動的な品質調整
- ネットワーク状況に応じた最適化

### 画面共有
- デスクトップ全体または特定のアプリケーション画面を共有
- 高フレームレート（最大30fps）でのスムーズな画面共有
- 1920x1080の高解像度サポート
- ワンクリックでの画面共有開始・停止

### 録画機能
- リアルタイム通話録画
- ローカル・リモート参加者の映像を合成
- WebM形式での高品質録画
- ワンクリックダウンロード機能

### 参加者管理
- リアルタイムでの参加者一覧表示
- 音声・ビデオの状態表示
- 参加者の追加・削除

## API エンドポイント

- `GET /api/` - API状態確認
- `WebSocket /ws` - リアルタイム通信

## ファイル構成

```
meetsonar/
├── client/           # フロントエンドコード
│   ├── src/
│   │   ├── components/   # Reactコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── lib/          # ユーティリティ
│   │   └── pages/        # ページコンポーネント
├── server/           # バックエンドコード
├── shared/           # 共有型定義
└── ...
```

## 開発スクリプト

- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run check` - TypeScript型チェック
- `npm run db:push` - データベーススキーマ適用

## ブラウザサポート

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## ライセンス

MIT License

## 貢献

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## サポート

問題や質問がある場合は、[Issues](https://github.com/your-username/meetsonar/issues)で報告してください。

---

MeetSonarを使用していただき、ありがとうございます！🎉
