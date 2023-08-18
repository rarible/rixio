export class CacheBase {}
export class CacheIdle extends CacheBase {
  readonly status = "idle"
  static create = () => {
    return new CacheIdle()
  }
}

export class CachePending extends CacheBase {
  readonly status = "pending"
  static create = () => {
    return new CachePending()
  }
}

export class CacheRejected extends CacheBase {
  readonly status = "rejected"
  constructor(public readonly error: unknown) {
    super()
  }

  static create = (err: unknown) => {
    return new CacheRejected(err)
  }
}

export class CacheFulfilled<T> extends CacheBase {
  readonly status = "fulfilled"
  readonly timestamp = Date.now()

  constructor(public readonly value: T) {
    super()
  }
  static create = <T>(value: T) => new CacheFulfilled<T>(value)
}

export type CacheState<T> = CacheIdle | CachePending | CacheRejected | CacheFulfilled<T>

export type KeyEventAdd<K> = {
  type: "add"
  key: K
}

export type KeyEventError<K> = {
  type: "error"
  key: K
  error: unknown
}

export type KeyEvent<K> = KeyEventAdd<K> | KeyEventError<K>

export function createAddKeyEvent<K>(key: K): KeyEventAdd<K> {
  return {
    type: "add",
    key,
  }
}

export function createErrorKeyEvent<K>(key: K, error: unknown): KeyEventError<K> {
  return {
    type: "error",
    key,
    error,
  }
}

export type DataLoader<K, V> = (key: K) => Promise<V>
export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>
