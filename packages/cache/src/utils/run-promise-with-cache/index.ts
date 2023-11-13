import type { Atom } from "@rixio/atom"
import type { CacheState } from "../../domain"
import { CacheFulfilled, CachePending, CacheRejected } from "../../domain"

export async function runPromiseWithCache<T, K extends T>(
  promise: Promise<K>,
  atom: Atom<CacheState<T>>,
): Promise<void> {
  const timer = setTimeout(() => atom.set(CachePending.create()), 0)
  try {
    const result = await promise
    return atom.set(CacheFulfilled.create(result))
  } catch (error) {
    return atom.set(CacheRejected.create(error))
  } finally {
    clearTimeout(timer)
  }
}
