import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  schoolId: string;
  schoolSlug: string;
  // The transaction client's real type is the tenant-scoped extension's transaction
  // client (see PrismaService.withTenant), which Prisma's extension typing makes
  // impractical to name here without a circular import. `any` is deliberate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any;
}

const als = new AsyncLocalStorage<TenantStore>();

export const TenancyContext = {
  run<T>(store: TenantStore, callback: () => T): T {
    return als.run(store, callback);
  },
  /**
   * Use this (not `run`) for async callbacks. `AsyncLocalStorage.run` only preserves
   * context for continuations scheduled synchronously within the callback — if the
   * callback just returns a promise without awaiting it, the `.then()` that eventually
   * resolves it happens outside the run() frame and loses the context. Awaiting here,
   * inside the callback `als.run` invokes, keeps that subscription within the frame.
   */
  async runAsync<T>(store: TenantStore, callback: () => Promise<T>): Promise<T> {
    // The explicit `await` (not just `return callback()`) matters: returning a promise
    // from an async function attaches `.then()` on a later microtask, outside this
    // frame. Awaiting attaches it synchronously, while still inside `als.run`.
    return als.run(store, async () => await callback());
  },
  get(): TenantStore | undefined {
    return als.getStore();
  },
  require(): TenantStore {
    const store = als.getStore();
    if (!store) {
      throw new Error('Tenant context is not available outside of a tenant-scoped request');
    }
    return store;
  },
};
