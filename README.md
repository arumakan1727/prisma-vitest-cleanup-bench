# Prisma + Vitest Cleanup bench

## 目的
- インフラストラクチャ層のリポジトリクラスのテストをする。テストケースごとの DB レコードのクリーンアップをするにあたり、どのような手法がよいかベンチマークをとる。
    - 方法 A: 各テストケースごとに tx を発行 & コミット + {TRUNCATE TABLE CASCADE / DELETE}
    - 方法 B: 各テストケースごとに tx を発行 & ロールバック (並列実行可能)
    - 方法 C: インメモリの PGlite を使用 (クリーンアップは方法 B と同様 tx 発行 & ロールバック)

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
pnpm test:A:truncate

pnpm test:A:deleteMany

pnpm test:B

pnpm test:C
```

各テストケースを N 回繰り返して実行したい場合は環境変数 TEST_REPEAT_COUNT に N を設定すればよい。 \
it() の中で N 回処理を繰り返すシンプルな実装。

```bash
TEST_REPEAT_COUNT=10 pnpm test:A:truncate

TEST_REPEAT_COUNT=10 pnpm test:A:deleteMany

TEST_REPEAT_COUNT=10 pnpm test:B

TEST_REPEAT_COUNT=10 pnpm test:C
```

複数のテストファイルを想定した並列テストを実行するには、まず下記コマンドでテストファイルを複製する。

```bash
task test-files:copy
```

これにより、`src/infrastructure/postgres/__test__/**/*.test.ts` がファイルごとに `{name}_copy{i}.test.ts` の形式で 10 回複製される。

その後は test:A, test:B, test:C を同様に実行すればよい。
ただし、方法 A は並列実行するとうまくいかないので、成功させるには以下のように --maxWorkers 1 を指定する必要がある。

```bash
# 方法Aは並列実行するとクリーンアップ処理が他のテストで作成したデータを消してしまい、テストが失敗する。
# --maxWorkers 1 を指定することで、テストを逐次実行する。
pnpm test:A:truncate --maxWorkers 1
pnpm test:A:deleteMany --maxWorkers 1
pnpm test:B --maxWorkers 1
pnpm test:C --maxWorkers 1
```

複製されたテストファイルを削除するには下記コマンドを実行する。

```bash
task test-files:remove
```
