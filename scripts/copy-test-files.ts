#!/usr/bin/env -S pnpm tsx
/**
 * テストファイルのコピー・削除ユーティリティ
 *
 * ベンチマーク用にテストファイルを複製したり、複製されたファイルを削除したりする。
 * 複製ファイルは {元のファイル名}_copy{番号}.test.ts の形式で作成される。
 */
import { copyFileSync, rmSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { globSync } from 'glob';

function showHelp(): void {
  console.log(`
Usage:
  copy-test-files.ts copy <rootDir> <copyCount>
  copy-test-files.ts remove <rootDir>
  copy-test-files.ts -h

Sub Commands:
  copy   : 指定ディレクトリ内の全 *.test.ts ファイルを複製する
  remove : 複製されたテストファイル (*_copy数字.test.ts) を削除する

copy <rootDir> <copyCount>:
  rootDir 配下の全 *.test.ts ファイルを copyCount 回複製する。
  複製ファイルは {元のファイル名}_copy{1..copyCount}.test.ts の形式で作成される。
  既に複製されたファイル (*_copy{整数}.test.ts) はスキップされる。

remove <rootDir>:
  rootDir 配下の *_copy{整数}.test.ts パターンにマッチするファイルを全て削除する。
`);
}

function main(): void {
  const args = process.argv.slice(2);

  // -h または --help が引数のどこかにあればヘルプを表示
  if (args.includes('-h') || args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  const [subcommand, ...restArgs] = args;

  if (subcommand === 'copy') {
    const [rootDir, copyCountStr] = restArgs;
    const copyCount = Number(copyCountStr);
    copyTestFiles(rootDir, copyCount);
  } else if (subcommand === 'remove') {
    const [rootDir] = restArgs;
    removeTestFiles(rootDir);
  } else {
    console.error('Usage: copy-test-files.ts <copy|remove> <rootDir> [copyCount]');
    console.error('       copy-test-files.ts -h');
    process.exit(1);
  }
}

const RE_COPY_FILE = /_copy\d+\.test\.ts$/;

function copyTestFiles(rootDir: string, copyCount: number): void {
  const stat = statSync(rootDir);
  if (!stat.isDirectory()) {
    console.error(`Error: ${rootDir} is not a directory`);
    process.exit(1);
  }

  if (!(copyCount >= 1 && copyCount <= 20)) {
    console.error('Error: copyCount must be between 1 and 20');
    process.exit(1);
  }

  const testFiles = globSync(`${rootDir}/**/*.test.ts`);

  for (const testFile of testFiles) {
    if (RE_COPY_FILE.test(testFile)) {
      continue;
    }

    const dir = dirname(testFile);
    const filename = basename(testFile);
    const nameWithoutExt = filename.replace('.test.ts', '');

    for (let i = 1; i <= copyCount; i++) {
      const newPath = join(dir, `${nameWithoutExt}_copy${i}.test.ts`);
      copyFileSync(testFile, newPath);
      console.log(`Copied: ${testFile} -> ${newPath}`);
    }
  }
}

function removeTestFiles(rootDir: string): void {
  const stat = statSync(rootDir);
  if (!stat.isDirectory()) {
    console.error(`Error: ${rootDir} is not a directory`);
    process.exit(1);
  }

  const testFiles = globSync(`${rootDir}/**/*.test.ts`);
  const filesToRemove = testFiles.filter((file) => {
    const filename = basename(file);
    return RE_COPY_FILE.test(filename);
  });

  for (const file of filesToRemove) {
    rmSync(file);
    console.log(`Removed: ${file}`);
  }
}

main();
