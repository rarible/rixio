import type { Fulfilled, Pending, SimpleRejected } from "@rixio/wrapped"

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
