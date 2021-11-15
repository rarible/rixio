import { Atom } from "@rixio/atom"
import { Observable } from "rxjs"
import { filter, first } from "rxjs/operators"
import {
	createFulfilledWrapped,
	createRejectedWrapped,
	markWrappedObservable,
	pendingWrapped,
	Wrapped,
} from "@rixio/wrapped"
import { MappedBehaviorSubject } from "./mapped-behavior-subject"
import { Cache, CacheState, createFulfilledCache, idleCache, save } from "./index"

export class CacheImpl<T> extends MappedBehaviorSubject<CacheState<T>, Wrapped<T>> implements Cache<T> {
	constructor(private readonly _atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom, pendingWrapped)
		markWrappedObservable(this)
		this.clear = this.clear.bind(this)
	}

	get atom(): Atom<CacheState<T>> {
		return this._atom
	}

	get valueAtom(): Atom<T> {
		// @ts-ignore
		return this._atom.lens("value")
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
				return { ...s, value: updateFn(s.value) }
			} else {
				return s
			}
		})
	}

	clear(): void {
		this.atom.set(idleCache as CacheState<T>)
	}

	protected _onValue(x: CacheState<T>) {
		switch (x.status) {
			case "idle":
				save(this._loader(), this._atom).then()
				this.checkAndNext(pendingWrapped)
				break
			case "pending":
				this.checkAndNext(pendingWrapped)
				break
			case "rejected":
				this.checkAndNext(createRejectedWrapped(x.error, this.clear))
				break
			case "fulfilled":
				this.checkAndNext(createFulfilledWrapped(x.value))
		}
	}

	private checkAndNext(value: Wrapped<T>) {
		if (value !== this.getValue()) {
			this.next(value)
		}
	}
}

async function getFinalValue<T>(state$: Observable<Wrapped<T>>): Promise<T> {
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
