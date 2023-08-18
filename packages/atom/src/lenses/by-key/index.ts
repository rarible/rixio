import { Lens, SimpleCache } from "@rixio/lens"

/**
 * Creates factory function that generates Lens for specific key, works with simple js objects
 * @param createDefaultValue function that will return initial value for new key
 */

export function byKeyFactory<K extends string, V>(
  createDefaultValue: (key: K) => V,
): (key: K) => Lens<Record<K, V>, V> {
  const cache = new SimpleCache<K, Lens<Record<K, V>, V>>((x: K) =>
    Lens.create(
      s => (x in s ? s[x] : createDefaultValue(x)),
      (s, xs) => {
        return {
          ...xs,
          [x]: s,
        }
      },
    ),
  )
  return x => cache.getOrCreate(x)
}
