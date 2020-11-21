import { Atom } from "@rixio/rxjs-atom/build"
import { getFinalValue, PromiseState, createPromiseStateFulfilled } from "./promise-state"
import { save } from "./save"

export interface Cache<T> {
	load(): Promise<T>
	get(force?: boolean): Promise<T>
	set(value: T): void
	modify(fn: (value: T) => T): void
	atom: Atom<PromiseState<T>>
}

export class CacheImpl<T> implements Cache<T> {
	constructor(private readonly _atom: Atom<PromiseState<T>>, private readonly _loader: () => Promise<T>) {}

	get atom(): Atom<PromiseState<T>> {
		return this._atom
	}

	load(): Promise<T> {
		return this._loader()
	}

	get(force: boolean = false): Promise<T> {
		const state$ = this.getAtomAndLoad(force)
		return getFinalValue(state$)
	}

	modify(fn: (value: T) => T): void {
		this.atom.modify(ps => {
			if (ps.status === "fulfilled") {
				return createPromiseStateFulfilled(fn(ps.value))
			} else {
				return ps
			}
		})
	}

	set(value: T): void {
		this.atom.set(createPromiseStateFulfilled(value))
	}

	private getAtomAndLoad(force: boolean = false): Atom<PromiseState<T>> {
		const state$ = this.atom
		if (force || state$.get().status === "idle") {
			save(this.load(), state$).then()
		}
		return state$
	}
}
