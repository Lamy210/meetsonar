# 📚 MeetSonar ドキュメント目次

MeetSonarプロジェクトの包括的なドキュメント集です。目的に応じて適切なドキュメントを参照してください。

## 🚀 開始ガイド

| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [README.md](../README.md) | プロジェクト全体の概要・クイックスタート | 全員 |
| [開発環境設定ガイド](./DEVELOPMENT_SETUP_GUIDE.md) | 詳細な環境構築手順 | 開発者 |
| [プロジェクト構成](./PROJECT_STRUCTURE.md) | ファイル・ディレクトリ構成の詳細 | 開発者 |
| [Docker開発ガイド](../README-DOCKER.md) | Dockerを使った開発環境 | 開発者 |

## 👥 ユーザーガイド

### 招待システム
| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [招待システムガイド](./INVITATION_SYSTEM_GUIDE.md) | 招待機能の使用方法（包括的） | ユーザー・開発者 |
| [URL招待ガイド](./URL_INVITATION_GUIDE.md) | URL招待の詳細手順 | ユーザー |

### メディア設定
| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [設定ユーザーガイド](./SETTINGS_USER_GUIDE.md) | 基本的な設定操作 | ユーザー |
| [メディア設定完全ガイド](./MEDIA_DEVICE_SETTINGS_COMPLETE_GUIDE.md) | 詳細なメディア設定 | ユーザー・開発者 |
| [メディア設定基本](./MEDIA_DEVICE_SETTINGS.md) | 基本的なメディア設定 | ユーザー |

## 🔧 技術ドキュメント

### API・技術仕様
| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [メディア設定API参照](./MEDIA_SETTINGS_API_REFERENCE.md) | メディア設定API詳細 | 開発者 |
| [メディア設定技術仕様](./MEDIA_SETTINGS_TECHNICAL_SPEC.md) | 技術実装の詳細 | 開発者 |
| [WebRTC実装ノート](./use-webrtc-implementation-notes.md) | WebRTCの実装詳細 | 開発者 |

### 実装・改善記録
| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [UI/UX改善実装](./UI_UX_IMPROVEMENTS_IMPLEMENTATION.md) | UI改善の記録 | 開発者 |
| [UI/UX更新記録](./UI,UX_20250725.md) | 2025年7月の更新 | 開発者 |
| [チャットスクロール修正](./CHAT_SCROLL_FIX.md) | チャット機能改善 | 開発者 |
| [チャット追加修正](./CHAT_ADDITIONAL_FIXES.md) | 追加のチャット修正 | 開発者 |
| [最終スクロール改善](./FINAL_SCROLL_IMPROVEMENTS.md) | スクロール改善総括 | 開発者 |

## 🎨 設計・アーキテクチャ

| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [チャットフロー図](./chat-flow-diagram.md) | チャット機能の設計図 | 開発者 |

## 📝 開発記録・レビュー

| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [chatブランチマージ後の指摘](./Claudeのchatブランチマージ後の指摘_2025-07-25.md) | 開発レビュー記録 | 開発者 |
| [websocketブランチ開発レビュー](./Claudeのwebsocketブランチ開発中に入ったレビュー.md) | WebSocket開発レビュー | 開発者 |

## 🧪 テスト・パフォーマンス

| ドキュメント | 概要 | 対象者 |
|-------------|------|--------|
| [テストガイド](../TESTING.md) | テスト実行方法 | 開発者 |
| [パフォーマンス分析](../PERFORMANCE_ANALYSIS.md) | パフォーマンス測定結果 | 開発者 |

## 📋 目的別ドキュメント選択ガイド

### 🆕 初めて使う場合
1. [README.md](../README.md) - プロジェクト概要
2. [開発環境設定ガイド](./DEVELOPMENT_SETUP_GUIDE.md) - 環境構築
3. [招待システムガイド](./INVITATION_SYSTEM_GUIDE.md) - 基本機能

### 👨‍💻 開発に参加する場合
1. [開発環境設定ガイド](./DEVELOPMENT_SETUP_GUIDE.md) - 環境構築
2. [プロジェクト構成](./PROJECT_STRUCTURE.md) - コード構成理解
3. [WebRTC実装ノート](./use-webrtc-implementation-notes.md) - 技術詳細
4. [メディア設定技術仕様](./MEDIA_SETTINGS_TECHNICAL_SPEC.md) - 実装仕様

### 🎥 アプリを使用する場合
1. [README.md](../README.md) - 基本的な使い方
2. [招待システムガイド](./INVITATION_SYSTEM_GUIDE.md) - 招待機能
3. [設定ユーザーガイド](./SETTINGS_USER_GUIDE.md) - 設定方法

### 🔧 機能を拡張する場合
1. [プロジェクト構成](./PROJECT_STRUCTURE.md) - コード構成
2. [メディア設定API参照](./MEDIA_SETTINGS_API_REFERENCE.md) - API仕様
3. [UI/UX改善実装](./UI_UX_IMPROVEMENTS_IMPLEMENTATION.md) - 改善パターン

### 🚨 問題を解決する場合
1. [開発環境設定ガイド](./DEVELOPMENT_SETUP_GUIDE.md) - トラブルシューティング
2. [テストガイド](../TESTING.md) - テスト方法
3. GitHub Issues - 既知の問題

## 📊 ドキュメント統計

| カテゴリ | ドキュメント数 | 最終更新 |
|---------|--------------|----------|
| 開始ガイド | 4 | 2025-01-24 |
| ユーザーガイド | 5 | 2025-01-24 |
| 技術ドキュメント | 6 | 2025-01-24 |
| 開発記録 | 6 | 2025-01-24 |
| **合計** | **21** | **2025-01-24** |

## 🔄 ドキュメントの更新

### 更新頻度
- **開始ガイド**: 機能追加時
- **ユーザーガイド**: UI変更時
- **技術ドキュメント**: 実装変更時
- **開発記録**: 開発進行時

### 貢献方法
1. ドキュメントの改善提案
2. 新機能のドキュメント追加
3. 翻訳・多言語対応
4. サンプル・スクリーンショット追加

## 📞 サポート

ドキュメントに関する質問や改善提案：
- [Issues](https://github.com/your-username/meetsonar/issues) - バグレポート・機能要求
- [Discussions](https://github.com/your-username/meetsonar/discussions) - 質問・議論

---

**MeetSonar Documentation Team** 📚
最終更新: 2025年1月24日
