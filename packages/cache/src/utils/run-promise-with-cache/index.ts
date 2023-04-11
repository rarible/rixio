import { Atom } from "@rixio/atom"
import { CacheFulfilled, CachePending, CacheRejected, CacheState } from "../../domain"

export async function runPromiseWithCache<T, K extends T>(
	promise: Promise<K>,
	atom: Atom<CacheState<T>>
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
