import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { PrismaClient } from '@prisma/client';
import { PrismaPGlite } from 'pglite-prisma-adapter';
import { setFactoryPrismaClient, TenantFactory } from '../factory';
import { testEnv } from '../test-env';

// package.json のあるディレクトリ
const PACKAGE_DIR = path.resolve(__dirname, '..', '..', '..', '..', '..');

export const MIGRATIONS_DIR = path.join(PACKAGE_DIR, 'prisma', 'migrations');

export const TEST_PGLITE_MIGRATION_SNAPSHOT_DIR = path.join(PACKAGE_DIR, 'tmp');

export const TEST_PGLITE_MIGRATION_SNAPSHOT_PATH = path.join(
  TEST_PGLITE_MIGRATION_SNAPSHOT_DIR,
  'pglite-test-migration-snapshot.tgz'
);

// この UUID は uuidgen コマンドで適当に生成したもの
export const MAIN_TENANT_ID = 'E424CAD0-38C7-4A15-B06A-8F4FFC680EE8';
export const OTHER_TENANT_ID = '34B5D628-81EC-4EFE-B57C-E143E114E1D1';

export default async () => {
  console.log('--- global-setup ---');

  const pg = new PGlite({
    dataDir: 'memory://',
    extensions: { citext },
  });

  if (testEnv.METHOD_C_DB_INIT_STRATEGY === 'snapshot') {
    // prisma を使わずに自前で pglite DB にマイグレーションを適用
    await applyMigrations(pg);

    // Main Tenant と Other Tenant を作成
    const adapter = new PrismaPGlite(pg);
    const prisma = new PrismaClient({ adapter });
    await prepareTenants(prisma);

    // pglite は memory:// であり、globalSetup と各テストとは CPU プロセスが異なるので、いったんマイグレーション結果をファイルに保存
    await fs.mkdir(TEST_PGLITE_MIGRATION_SNAPSHOT_DIR, { recursive: true });

    const snapshotBlob = await pg.dumpDataDir('gzip');
    await fs.writeFile(
      TEST_PGLITE_MIGRATION_SNAPSHOT_PATH,
      Buffer.from(await snapshotBlob.arrayBuffer())
    );
    console.log(`Saved PGlite migration snapshot to: ${TEST_PGLITE_MIGRATION_SNAPSHOT_PATH}`);
  }

  await pg.close();
};

export const applyMigrations = async (pg: PGlite) => {
  console.log(`Applying migrations from: ${MIGRATIONS_DIR}`);

  const stats = await fs.stat(MIGRATIONS_DIR);
  if (!stats.isDirectory()) {
    throw new Error(`Migrations directory does not exist: ${MIGRATIONS_DIR}`);
  }

  const dirNames = (await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const dirName of dirNames) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, dirName, 'migration.sql'), 'utf-8');
    console.log(`Applying migration: ${dirName}`);
    await pg.exec(sql);
  }
};

export const prepareTenants = async (prisma: PrismaClient) => {
  setFactoryPrismaClient(prisma);
  await TenantFactory.create({ id: MAIN_TENANT_ID, name: 'Main Tenant' });
  await TenantFactory.create({ id: OTHER_TENANT_ID, name: 'Other Tenant' });
};
