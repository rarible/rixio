import type { Fulfilled, Pending, SimpleRejected } from "@rixio/wrapped"

export type DataLoader<K, V> = (key: K) => Promise<V>
export type ListDataLoader<K, V> = (keys: K[]) => Promise<[K, V][]>

export type KeyEventType = "add" | "remove"
export interface KeyEvent<K> {
	type: KeyEventType
	key: K
}

export function createAddEvent<T>(key: T) {
	return {
		key,
		type: "add" as const,
	}
}

export const UNDEFINED = Symbol.for("UNDEFINED")
export type NotFound = typeof UNDEFINED
export function isNotFound(value: unknown): value is NotFound {
	return value === UNDEFINED
}

export const cacheKey = "___cache___"
export const cacheSymbol = Symbol.for(cacheKey)

export const idleCache: CacheState<any> = {
	status: "idle",
	[cacheKey]: cacheSymbol,
}

export const pendingCache: CacheState<any> = {
	status: "pending",
	[cacheKey]: cacheSymbol,
}

export function createRejectedCache(error: any): CacheState<any> {
	return {
		status: "rejected",
		error,
		[cacheKey]: cacheSymbol,
	}
}

export function createFulfilledCache<T>(value: T): CacheState<T> {
	return {
		status: "fulfilled",
		value,
		[cacheKey]: cacheSymbol,
	}
}

export type Idle = {
	status: "idle"
}

export type CacheState<T> = (Idle | Pending | SimpleRejected | Fulfilled<T>) & {
	[cacheKey]: typeof cacheSymbol
}
