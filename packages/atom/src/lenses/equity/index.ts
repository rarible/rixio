import { Lens, SimpleCache } from "@rixio/lens"

export function equityLensFactory<T>() {
  const cache = new SimpleCache<T, Lens<T, boolean>>((key: T) =>
    Lens.create<T, boolean>(
      x => x === key,
      () => key,
    ),
  )
  return (x: T) => cache.getOrCreate(x)
}
