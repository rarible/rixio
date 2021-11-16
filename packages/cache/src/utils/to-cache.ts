import type { Wrapped } from "@rixio/wrapped"
import { CacheState, createFulfilledCache, createRejectedCache, pendingCache } from "../cache/domain"

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
