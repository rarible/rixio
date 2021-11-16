import type { Map as IM } from "immutable"
import { Lens, Prism, SimpleCache } from "@rixio/lens"
import type { DataLoader, ListDataLoader } from "../common/domain"

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

const byKeyCache = new SimpleCache<any, Prism<IM<any, any>, any>>((key: any) =>
	Prism.create(
		(map: IM<any, any>) => map.get(key),
		(v, map) => map.set(key, v)
	)
)
