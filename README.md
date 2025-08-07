# Prisma + Vitest bench

## 目的
- local の Docker Compose の PostgreSQL でインフラストラクチャ層のリポジトリクラスのテストをする。
- テストケースごとの DB レコードのクリーンアップをするにあたり、どのような手法がよいかベンチマークをとる。
    - 方法A: 各テストケースごとに tx を発行 & コミット + TRUNCATE TABLE CASCADE
    - 方法B: 各テストケースごとに tx を発行 & ロールバック (並列実行可能)
    - 方法C: 単一のトランザクションを張って各テストケースごとに SAVEPOINT sp_test, ROLLBACK to sp_test (並列実行不可能)

## 技術スタック
- TypeScript + Zod + Prisma (PostgreSQL) + Vitest
- オニオンアーキテクチャ
