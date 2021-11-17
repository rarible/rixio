import type { Atom } from "@rixio/atom"
import { noop, Observable } from "rxjs"
import { first, skip } from "rxjs/operators"
import { MappedReplaySubject } from "./mapped-replay-subject"
import { CacheState, createFulfilledCache, idleCache } from "./domain"
import { save } from "./impl"

export interface Memo<T> extends Observable<T> {
	get(force?: boolean): Promise<T>
	set(value: T): void
	modifyIfFulfilled(updateFn: (currentValue: T) => T): void
	clear(): void
	atom: Atom<CacheState<T>>
}

export class MemoImpl<T> extends MappedReplaySubject<CacheState<T>, T> implements Memo<T> {
	private skip: number = 0

	constructor(private readonly _atom$: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom$, 1)
	}

	get atom(): Atom<CacheState<T>> {
		return this._atom$
	}

	get(force = false): Promise<T> {
		if (force) {
			this.clear()
		}
		return this.pipe(skip(Math.max(this.skip, 0)), first()).toPromise()
	}

	set(value: T): void {
		this._atom$.set(createFulfilledCache(value))
	}

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void {
		this._atom$.modify(s => {
			if (s.status === "fulfilled") {
				return {
					...s,
					value: updateFn(s.value),
				}
			}
			return s
		})
	}

	clear(): void {
		this.skip = this.skip + 1
		this._atom$.set(idleCache)
	}

	protected _onValue(x: CacheState<T>) {
		switch (x.status) {
			case "idle":
				save(this._loader(), this._atom$).catch(noop)
				break
			case "rejected":
				this.error(x.error)
				break
			case "fulfilled":
				this.next(x.value)
				break
		}
	}
}
