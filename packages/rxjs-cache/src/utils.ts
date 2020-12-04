import { Wrapped, createFulfilledWrapped, pendingWrapped, createRejectedWrapped } from "@rixio/rxjs-wrapped"
import { CacheState, createFulfilledCache, pendingCache, createRejectedCache } from "./domain"

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
