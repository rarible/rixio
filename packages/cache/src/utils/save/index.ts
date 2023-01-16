import { Atom } from "@rixio/atom"
import { CacheFulfilled, CachePending, CacheRejected, CacheState } from "../../domain"

export function save<T, K extends T>(_promise: Promise<K>, atom: Atom<CacheState<T>>): Promise<K> {
	atom.set(CachePending.create())
	return new Promise<K>((resolve, reject) => {
		Promise.resolve(_promise)
			.then(x => {
				atom.set(CacheFulfilled.create(x))
				resolve(x)
			})
			.catch(x => {
				atom.set(CacheRejected.create(x))
				reject(x)
			})
	})
}
