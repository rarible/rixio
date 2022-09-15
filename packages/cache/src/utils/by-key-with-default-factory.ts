import { Lens, SimpleCache } from "@rixio/lens"
import { Map as IM } from "immutable"

export function byKeyWithDefaultFactory<K, V>(createDefaultValue: (key: K) => V): (key: K) => Lens<IM<K, V>, V> {
	const cache = new SimpleCache<K, Lens<IM<K, V>, V>>((x: K) =>
		Lens.create(
			(s: IM<K, V>) => s.get(x) || createDefaultValue(x),
			(s, xs) => xs.set(x, s)
		)
	)
	return x => cache.getOrCreate(x)
}
