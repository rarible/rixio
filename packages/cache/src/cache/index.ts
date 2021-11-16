import { Atom } from "@rixio/atom"
import { Observable } from "rxjs"
import { filter, first } from "rxjs/operators"
import * as Wrapped from "@rixio/wrapped"
import { MappedBehaviorSubject } from "../utils/mapped-behavior-subject"
import { save } from "../utils/save"
import { CacheState, createFulfilledCache, idleCache } from "../common/domain"

export interface Cache<T> extends Observable<Wrapped.Wrapped<T>> {
	get(force?: boolean): Promise<T>
	set(value: T): void
	modifyIfFulfilled(updateFn: (currentValue: T) => T): void
	clear(): void
	atom: Atom<CacheState<T>>
}

/**
 * @deprecated this type of cache deprecated
 * please use memo instead
 */
export class CacheImpl<T> extends MappedBehaviorSubject<CacheState<T>, Wrapped.Wrapped<T>> implements Cache<T> {
	constructor(private readonly _atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom, Wrapped.pendingWrapped)
		Wrapped.markWrappedObservable(this)
		this.clear = this.clear.bind(this)
	}

	get atom(): Atom<CacheState<T>> {
		return this._atom
	}

	get(force: boolean = false): Promise<T> {
		if (force) {
			this.clear()
		}
		return getFinalValue(this)
	}

	set(value: T): void {
		this.atom.set(createFulfilledCache(value))
	}

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void {
		this.atom.modify(s => {
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
		this.atom.set(idleCache)
	}

	protected _onValue(x: CacheState<T>) {
		switch (x.status) {
			case "idle":
				save(this._loader(), this._atom).then()
				this.checkAndNext(Wrapped.pendingWrapped)
				break
			case "pending":
				this.checkAndNext(Wrapped.pendingWrapped)
				break
			case "rejected":
				this.checkAndNext(Wrapped.createRejectedWrapped(x.error, this.clear))
				break
			case "fulfilled":
				this.checkAndNext(Wrapped.createFulfilledWrapped(x.value))
		}
	}

	private checkAndNext(value: Wrapped.Wrapped<T>) {
		if (value !== this.getValue()) {
			this.next(value)
		}
	}
}

async function getFinalValue<T>(state$: Observable<Wrapped.Wrapped<T>>): Promise<T> {
	const result = await state$
		.pipe(
			filter(x => x.status === "rejected" || x.status === "fulfilled"),
			first()
		)
		.toPromise()
	switch (result.status) {
		case "rejected":
			return Promise.reject(result.error)
		case "fulfilled":
			return Promise.resolve(result.value)
		default:
			throw new Error("Never happens")
	}
}
