# Project Overview

## Project Name
prisma-vitest-bench

## Purpose
PostgreSQL（Docker Compose）を使用したインフラストラクチャ層のリポジトリクラスのテストにおいて、テストケースごとのDBレコードクリーンアップ手法のベンチマークを行うプロジェクト。

## Tech Stack
- **Language**: TypeScript
- **Database**: PostgreSQL (Docker/Podman) with Row Level Security (RLS)
- **ORM**: Prisma
- **Validation**: Zod (runtime schema validation with branded types)
- **Testing**: Vitest
- **Formatter/Linter**: Biome
- **Package Manager**: pnpm
- **Task Runner**: Task (for container operations)
- **Test Data**: @quramy/prisma-fabbrica

## Database Architecture
- 2つのデータベースユーザー:
  - `admin`: スーパーユーザー（RLSバイパス可能、マイグレーションとテスト用）
  - `app`: 通常ユーザー（RLS適用）
- 複数のデータベース:
  - Development DB
  - Shadow DB (Prisma用)
  - Test DB

## Test Cleanup Strategies
3つのテストクリーンアップ戦略を比較:
1. **Method A**: 各テストケースごとにトランザクション＋コミット＋TRUNCATE TABLE CASCADE
2. **Method B**: 各テストケースごとにトランザクション＋ロールバック（並列実行可能）
3. **Method C**: 単一トランザクションで各テストケースごとにSAVEPOINT/ROLLBACK（並列実行不可）