import { Atom } from "@rixio/rxjs-atom/build"
import { getFinalValue, PromiseState } from "./promise-state"
import { save } from "./save"

export interface Cache<T> {
	load(): Promise<T>
	get(force?: boolean): Promise<T>
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

	private getAtomAndLoad(force: boolean = false) {
		const state$ = this.atom
		if (force || state$.get().status === "idle") {
			save(this.load(), state$).then()
		}
		return state$
	}
}
