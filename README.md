# Prisma + Vitest Cleanup bench

## 目的
- インフラストラクチャ層のリポジトリクラスのテストをする。テストケースごとの DB レコードのクリーンアップをするにあたり、どのような手法がよいかベンチマークをとる。
    - 方法 A: 各テストケースごとに tx を発行 & コミット + TRUNCATE TABLE CASCADE
    - 方法 B: 各テストケースごとに tx を発行 & ロールバック (並列実行可能)
    - 方法 C: オンメモリの PGlite を使用 (クリーンアップは方法 B と同様 tx 発行 & ロールバック)

## 技術スタック
- TypeScript + Zod + Prisma (PostgreSQL) + Vitest
- オニオンアーキテクチャ

## 環境構築

mise と docker / podman がインストールされていること。

```bash
mise trust

mise i

task docker:up

task install

task db:migrate:deploy
```

詳細は Taskfile.yaml や Taskfile.container.yaml を参照。

## テスト

README 冒頭で示した各種クリーンアップ方法によるテストは以下コマンドで実行可能。

```bash
pnpm test:A

pnpm test:B

pnpm test:C
```

各テストケースを N 回繰り返して実行したい場合は環境変数 TEST_REPEAT_COUNT に N を設定すればよい。 \
it() の中で N 回処理を繰り返すシンプルな実装。

```bash
TEST_REPEAT_COUNT=10 pnpm test:A

TEST_REPEAT_COUNT=10 pnpm test:B

TEST_REPEAT_COUNT=10 pnpm test:C
```
