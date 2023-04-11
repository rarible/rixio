import { Map as IM } from "immutable"
import { Lens, SimpleCache } from "@rixio/lens"

/**
 * Creates factory function that generates Lens for specific key, works with immutable map
 * @param createDefaultValue function that will return initial value for new key
 */

export function byKeyImmutableFactory<K, V>(createDefaultValue: (key: K) => V): (key: K) => Lens<IM<K, V>, V> {
	const cache = new SimpleCache<K, Lens<IM<K, V>, V>>((x: K) =>
		Lens.create(
			(s: IM<K, V>) => (s.has(x) ? s.get(x)! : createDefaultValue(x)),
			(s, xs) => xs.set(x, s)
		)
	)
	return x => cache.getOrCreate(x)
}
