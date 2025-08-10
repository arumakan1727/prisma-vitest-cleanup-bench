# Prisma + Vitest Cleanup bench

## 目的
- インフラストラクチャ層のリポジトリクラスのテストをする。テストケースごとの DB レコードのクリーンアップをするにあたり、どのような手法がよいかベンチマークをとる。
    - 方法 A: 各テストケースごとに tx を発行 & コミット + TRUNCATE TABLE CASCADE
    - 方法 B: 各テストケースごとに tx を発行 & ロールバック (並列実行可能)
    - 方法 C: オンメモリの PGlite を使用 (クリーンアップは方法 B と同様 tx 発行 & ロールバック)

## 技術スタック
- TypeScript + Zod + Prisma (PostgreSQL) + Vitest
- オニオンアーキテクチャ
