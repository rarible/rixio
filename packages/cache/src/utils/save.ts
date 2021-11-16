import { Atom } from "@rixio/atom"
import { fromPromise } from "@rixio/wrapped"
import { noop } from "rxjs"
import { map } from "rxjs/operators"
import type { CacheState } from "../cache/domain"
import { toCache } from "./to-cache"

/**
 * Initiate promise resolving and map value to concrete Atom
 * pending, rejected, resolved states will be mapped to Atom
 * @param promise promise that should be mapped to state
 * @param atom where to save state of current promise
 */
export async function save<T>(promise: Promise<T>, atom: Atom<CacheState<T>>): Promise<void> {
	return Atom.set(atom, fromPromise(promise).pipe(map(toCache)))
		.toPromise()
		.then(noop)
		.catch(noop)
}

export function saveAndReturn<T>(promise: Promise<T>, atom: Atom<CacheState<T>>): Promise<T> {
	save(promise, atom).then(noop).catch(noop)
	return promise
}
