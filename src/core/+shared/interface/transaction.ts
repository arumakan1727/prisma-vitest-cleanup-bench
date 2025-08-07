import type { TenantId } from '~/core/tenant/value-object';

/**
 * 読み取り処理しかしないトランザンクションのハンドル。
 * tenantId は PostgreSQL の RLS で使う (ドメイン層で PostgreSQL を意識してはいけないが)。
 * Aurora の Reader Endpoint に投げる想定。
 *
 * インフラストラクチャ層でこれを implements して Prisma の tx をフィールドとして追加する想定。
 *
 * 型で表現しているだけで、SQL が読み取り処理しかしないことを静的にチェックできるわけではない。
 * リポジトリ層のメソッド引数に指定するが、そのメソッドが読み取り処理しかしないことを保証するのはプログラマの責務。
 */
export interface IReadOnlyTxHandle {
  readonly tenantId: TenantId;
}

/**
 * 読み取り・書き込みの両方ができるトランザクションのハンドル。
 * Aurora の Cluster Endpoint に投げる想定。
 *
 * リポジトリ層のメソッドの引数にこの型を使うことで、誤って読み取り専用トランザクション内で使われてしまうことを防ぐ。
 */
export interface IReadWriteTxHandle extends IReadOnlyTxHandle {
  readonly __type: 'ReadWrite'; // Branded Type と同様の Opaque Type
}

export type TransactionOptions = {
  maxWait?: number;
  timeout?: number;
};

/**
 * トランザクションを実行するインターフェース。
 * 実装はインフラストラクチャ層で定義する。
 */
export interface ITxExecutor<
  ReadOnlyTx extends IReadOnlyTxHandle = IReadOnlyTxHandle,
  ReadWriteTx extends IReadWriteTxHandle = IReadWriteTxHandle,
> {
  /**
   * 読み取り専用トランザクションを実行する。
   * Aurora の Reader Endpoint に投げる想定。
   */
  doReadOnlyTx<TResult>(
    tenantId: TenantId,
    fn: (txHandle: ReadOnlyTx) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult>;

  /**
   * 読み取り・書き込みの両方ができるトランザクションを実行する。
   * Aurora の Cluster Endpoint に投げる想定。
   */
  doReadWriteTx<TResult>(
    tenantId: TenantId,
    fn: (txHandle: ReadWriteTx) => Promise<TResult>,
    options?: TransactionOptions
  ): Promise<TResult>;
}
