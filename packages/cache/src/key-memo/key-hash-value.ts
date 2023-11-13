export type CacheConfig<T> = {
  create: () => T
  onCreate?: (val: T) => void
}

type CacheData<T> = {
  timestamp: Date
  value: T
}

export class Cache<T> {
  private data: CacheData<T> | undefined = undefined

  constructor(private readonly config: CacheConfig<T>) {}

  get = () => {
    if (!this.data) {
      const value = this.config.create()
      this.config.onCreate?.(value)
      this.data = {
        value,
        timestamp: new Date(),
      }
    }
    return this.data.value
  }
}

export type CacheKeyHashConfig<T, K> = {
  toHash: (raw: T) => string
  create: (key: T) => K
  onCreate?: (key: T, val: K) => void
}

export class KeyHashCache<T, K> {
  private readonly map = new Map<string, Cache<K>>()

  constructor(private readonly config: CacheKeyHashConfig<T, K>) {}

  get = (key: T) => {
    const hash = this.config.toHash(key)
    const saved = this.map.get(hash)
    if (!saved) {
      const next = new Cache({
        create: () => this.config.create(key),
        onCreate: val => this.config.onCreate?.(key, val),
      })

      this.map.set(hash, next)
      return next.get()
    }
    return saved.get()
  }
}
