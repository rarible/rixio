import { Map as IM } from "immutable"
import { map } from "rxjs/operators"
import { Atom } from "@rixio/atom"
import { Lens, Prism, SimpleCache } from "@rixio/lens"
import { Wrapped, createFulfilledWrapped, pendingWrapped, createRejectedWrapped, fromPromise } from "@rixio/wrapped"
import {
	CacheState,
	createFulfilledCache,
	pendingCache,
	createRejectedCache,
	DataLoader,
	ListDataLoader,
} from "./domain"

export function toCache<T>(wrapped: Wrapped<T>): CacheState<T> {
	switch (wrapped.status) {
		case "fulfilled":
			return createFulfilledCache(wrapped.value)
		case "pending":
			return pendingCache
		case "rejected":
			return createRejectedCache(wrapped.error)
	}
}
export function toWrapped<T>(cache: CacheState<T>): Wrapped<T> {
	switch (cache.status) {
		case "fulfilled":
			return createFulfilledWrapped(cache.value)
		case "idle":
		case "pending":
			return pendingWrapped
		case "rejected":
			return createRejectedWrapped(cache.error)
	}
}

export async function save<T>(promise: PromiseLike<T>, atom: Atom<CacheState<T>>) {
	const observable = fromPromise(promise).pipe(map(toCache))
	await Atom.set(atom, observable).toPromise()
}

export function toListDataLoader<K, V>(loader: DataLoader<K, V>): ListDataLoader<K, V> {
	return ids => Promise.all(ids.map(id => loader(id).then(v => [id, v] as [K, V])))
}

export function byKey<K, V>(key: K): Prism<IM<K, V>, V> {
	return byKeyCache.getOrCreate(key)
}

export function byKeyWithDefaultFactory<K, V>(defaultValue: V): (key: K) => Lens<IM<K, V>, V> {
	const cache = new SimpleCache<K, Lens<IM<K, V>, V>>((key: K) =>
		Lens.create(
			(map: IM<K, V>) => map.get(key) || defaultValue,
			(v, map) => map.set(key, v)
		)
	)
	return key => cache.getOrCreate(key)
}

export const byKeyCache = new SimpleCache<any, Prism<IM<any, any>, any>>((key: any) =>
	Prism.create(
		(map: IM<any, any>) => map.get(key),
		(v, map) => map.set(key, v)
	)
)
