import { createFulfilledWrapped, createRejectedWrapped, pendingWrapped, Wrapped } from "@rixio/wrapped"
import type { CacheState } from "../cache/domain"

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
