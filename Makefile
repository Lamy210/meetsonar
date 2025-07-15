# MeetSonar Docker Development Makefile

.PHONY: help build up down logs shell-backend shell-frontend shell-db clean db-migrate db-push db-studio

# デフォルトターゲット
help:
	@echo "MeetSonar Docker 開発コマンド:"
	@echo ""
	@echo "  make up          - 全サービスを起動"
	@echo "  make up-watch    - Watch モードで起動 (ファイル変更で自動リロード)"
	@echo "  make down        - 全サービスを停止"
	@echo "  make build       - 全コンテナをビルド"
	@echo "  make rebuild     - コンテナを再ビルドして起動"
	@echo ""
	@echo "  make logs        - 全サービスのログを表示"
	@echo "  make logs-f      - フロントエンドのログを表示"
	@echo "  make logs-b      - バックエンドのログを表示"
	@echo "  make logs-db     - データベースのログを表示"
	@echo ""
	@echo "  make shell-backend   - バックエンドコンテナにシェル接続"
	@echo "  make shell-frontend  - フロントエンドコンテナにシェル接続"
	@echo "  make shell-db        - データベースコンテナにシェル接続"
	@echo ""
	@echo "  make db-migrate  - データベースマイグレーション実行"
	@echo "  make db-push     - データベーススキーマをプッシュ"
	@echo "  make db-studio   - Drizzle Studio を起動"
	@echo ""
	@echo "  make clean       - 全コンテナ・ボリューム・イメージを削除"
	@echo "  make clean-soft  - コンテナとネットワークのみ削除"

# サービス管理
up:
	docker compose up -d

up-watch:
	docker compose watch

down:
	docker compose down

build:
	docker compose build

rebuild:
	docker compose down
	docker compose build --no-cache
	docker compose up -d

# ログ表示
logs:
	docker compose logs -f

logs-f:
	docker compose logs -f frontend

logs-b:
	docker compose logs -f backend

logs-db:
	docker compose logs -f postgres

# シェル接続
shell-backend:
	docker compose exec backend sh

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec postgres psql -U meetsonar -d meetsonar

# データベース操作
db-migrate:
	docker compose exec backend npm run db:migrate

db-push:
	docker compose exec backend npm run db:push

db-studio:
	docker compose exec backend npm run db:studio

# クリーンアップ
clean:
	docker compose down -v --rmi all --remove-orphans
	docker system prune -f

clean-soft:
	docker compose down --remove-orphans
