import { Atom } from "@rixio/atom"
import { first } from "rxjs/operators"
import { MappedSubject } from "./mapped-subject"
import { CacheState, createFulfilledCache, idleCache, Memo, save } from "./index"

export class MemoImpl<T> extends MappedSubject<CacheState<T>, T> implements Memo<T> {
	constructor(private readonly _atom: Atom<CacheState<T>>, private readonly _loader: () => Promise<T>) {
		super(_atom)
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
		return this.pipe(first()).toPromise()
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
				break
			case "rejected":
				this.clear()
				this.next(x.error)
				break
			case "fulfilled":
				this.next(x.value)
		}
	}
}
