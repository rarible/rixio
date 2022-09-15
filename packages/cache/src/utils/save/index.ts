import { Atom } from "@rixio/atom"
import { from } from "@rixio/wrapped"
import { map } from "rxjs/operators"
import { CacheState } from "../../domain"
import { toCache } from "../to-cache"

export async function save<T, K extends T>(promise: PromiseLike<K>, atom: Atom<CacheState<T>>): Promise<K> {
	const observable = from(promise).pipe(map(toCache))
	await Atom.set(atom, observable).toPromise()
	return promise
}
