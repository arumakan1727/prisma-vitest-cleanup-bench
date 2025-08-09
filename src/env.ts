import * as z from 'zod';

const zEnv = z.object({
  APP_DATABASE_URL: z.url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  /**
   * - AllQuery: 全てのクエリをログ出力
   * - SlowQuery: 実行時間が PRISMA_SLOW_QUERY_THRESHOLD_MS 以上のクエリをログ出力 (通常時のデフォルト)
   * - NoQuery: ログ出力しない (テスト時のデフォルト)
   */
  SQL_LOG_LEVEL: z
    .enum(['All', 'OnlySlow', 'Silent'])
    .default(process.env['NODE_ENV'] === 'test' ? 'Silent' : 'OnlySlow'),
  SQL_SLOW_THRESHOLD_MS: z.number().default(3),
});

export const env = zEnv.parse(process.env);
