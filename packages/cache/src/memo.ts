import type { Atom } from "@rixio/atom"
import { Observable, ReplaySubject, Subscription } from "rxjs"
import { first } from "rxjs/operators"
import { CacheState, createFulfilledCache, idleCache } from "./domain"
import { save } from "./impl"

export interface Memo<T> extends Observable<T> {
	get(force?: boolean): Promise<T>
	set(value: T): void
	modifyIfFulfilled(updateFn: (currentValue: T) => T): void
	clear(): void
	atom: Atom<CacheState<T>>
}

export class MemoImpl<T> extends Observable<T> implements Memo<T> {
	private _sharedBuffer$: ReplaySubject<T> | undefined = undefined
	private _subscription: Subscription | undefined = undefined
	private _refCount = 0

	constructor(public readonly atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(subscriber => {
			const initial = atom.get()

			if (initial.status === "rejected") {
				this.clear()
			}

			if (!this._sharedBuffer$) {
				this._sharedBuffer$ = new ReplaySubject(1)
				this._subscription = atom.subscribe({
					next: x => {
						switch (x.status) {
							case "idle":
								save(this._loader(), this.atom).then()
								break
							case "rejected":
								this._sharedBuffer$?.error(x.error)
								break
							case "fulfilled":
								this._sharedBuffer$?.next(x.value)
								break
						}
					},
				})
			}

			this._refCount = this._refCount + 1
			const localSub = this._sharedBuffer$!.subscribe({
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
		this.clear = this.clear.bind(this)
	}

	async get(force = false): Promise<T> {
		if (force) {
			this.clear()
		}
		return this.pipe(first()).toPromise()
	}

	set(value: T): void {
		this.atom.set(createFulfilledCache(value))
	}

	modifyIfFulfilled(fn: (current: T) => T): void {
		this.atom.modify(s => {
			if (s.status === "fulfilled") {
				return {
					...s,
					value: fn(s.value),
				}
			}
			return s
		})
	}

	clear(): void {
		this.atom.set(idleCache)
	}
}
