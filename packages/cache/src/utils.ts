import { Wrapped, createFulfilledWrapped, pendingWrapped, createRejectedWrapped } from "@rixio/wrapped"
import { CacheState, createFulfilledCache, pendingCache, createRejectedCache } from "./domain"
import { UnknownError } from "./errors"
import { DataLoader, ListDataLoader } from "./key"

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

export function toListLoader<K, V>(
	loader: DataLoader<K, V>,
	createFallback?: (key: K, error: unknown) => V
): ListDataLoader<K, V> {
	return async keys => {
		const map = new Map<K, [K, V]>()
		await Promise.all(
			keys.map(key =>
				loader(key)
					.then(v => {
						map.set(key, [key, v])
					})
					.catch(error => {
						if (createFallback) {
							map.set(key, [key, createFallback(key, error)])
						}
					})
			)
		)
		const results: [K, V][] = []
		keys.forEach(key => {
			if (map.has(key)) {
				results.push(map.get(key)!)
			}
		})
		return results
	}
}

export function toGenericError(originalError: unknown, fallbackMessage: string) {
	if (originalError instanceof Error) return originalError
	return new UnknownError(fallbackMessage)
}
