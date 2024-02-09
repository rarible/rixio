import type { Atom } from "@rixio/atom"
import type { Subscription } from "rxjs"
import { Observable, ReplaySubject } from "rxjs"
import { first } from "rxjs/operators"
import type { CacheState } from "../domain"
import { CacheFulfilled, CacheIdle } from "../domain"
import { runPromiseWithCache } from "../utils"

export interface Memo<T> extends Observable<T> {
  get: (force?: boolean) => Promise<T>
  set: (value: T) => void
  modifyIfFulfilled: (updateFn: (currentValue: T) => T) => void
  clear: () => void
  atom: Atom<CacheState<T>>
}

export type MemoConfig = {
  /**
   * Set a live time that will be used for cache invalidation
   * invalidation happens only whenever Memo is accessed
   * @default Infinity
   */
  cacheLiveTimeMs: number
}

export class MemoImpl<T> extends Observable<T> implements Memo<T> {
  private _sharedBuffer$: ReplaySubject<T> | undefined = undefined
  private _subscription: Subscription | undefined = undefined
  private _refCount = 0
  private readonly _config: MemoConfig

  constructor(
    public readonly atom: Atom<CacheState<T>>,
    private readonly _loader: () => Promise<T>,
    readonly config: Partial<MemoConfig> = {},
  ) {
    super(subscriber => {
      const initial = atom.get()

      // When user subscribes and it's in failed state then we have to reset it
      if (initial.status === "rejected") this.clear()

      // When user subscribes and it's in stalled state then we have to reset it
      if (initial.status === "fulfilled" && this.shouldRefresh(initial)) this.clear()

      if (!this._sharedBuffer$) {
        this._sharedBuffer$ = new ReplaySubject(1)
        this._subscription = atom.subscribe({
          next: x => {
            switch (x.status) {
              case "idle":
                runPromiseWithCache(this._loader(), this.atom).then()
                break
              case "rejected":
                this._sharedBuffer$?.error(x.error)
                break
              case "fulfilled":
                this._sharedBuffer$?.next(x.value)
                break
              default:
                break
            }
          },
        })
      }

      this._refCount = this._refCount + 1
      const localSub = this._sharedBuffer$.subscribe({
        error: err => subscriber.error(err),
        next: value => subscriber.next(value),
      })

      subscriber.add(() => {
        localSub.unsubscribe()
        this._refCount = this._refCount - 1
        if (this._refCount === 0 && this._subscription) {
          this._subscription.unsubscribe()
          this._subscription = undefined
          this._sharedBuffer$ = undefined
        }
      })

      return subscriber
    })

    this._config = {
      ...createDefaultConfig(),
      ...config,
    }
  }

  get = async (force = false): Promise<T> => {
    if (force) this.clear()

    const [result] = await Promise.all([
      // This will emit subscribe
      this.pipe(first()).toPromise(),
      // It may be previous value so just to be sure that it's
      // fresh value after reset we need to wait for atom state change
      new Promise<T>((resolve, reject) => {
        this.atom
          .pipe(
            // It will kill subscription right after first result
            first(x => x.status === "fulfilled" || x.status === "rejected"),
          )
          .subscribe(value => {
            switch (value.status) {
              case "fulfilled":
                return resolve(value.value)
              case "rejected":
                return reject(value.error)
              default:
                throw new Error("Never happen")
            }
          })
      }),
    ])
    return result
  }

  set = (value: T): void => this.atom.set(CacheFulfilled.create(value))

  modifyIfFulfilled = (fn: (current: T) => T): void =>
    this.atom.modify(s => {
      if (s.status === "fulfilled") {
        return {
          ...s,
          value: fn(s.value),
        }
      }
      return s
    })

  clear = (): void => this.atom.set(CacheIdle.create())

  private shouldRefresh(value: CacheFulfilled<T>) {
    // Refresh cache in case when live time is exceeded
    return value.timestamp + this._config.cacheLiveTimeMs < Date.now()
  }
}

function createDefaultConfig(): MemoConfig {
  return {
    cacheLiveTimeMs: 1000 * 60 * 10, // 10 minutes cache
  }
}
