import type { Observable } from "rxjs"
import type { Fulfilled, Pending, Wrapped, SimpleRejected } from "@rixio/wrapped"
import type { Atom } from "@rixio/atom"

const cache = "___cache___"
const symbol = Symbol.for(cache)

type IsCache = {
	[cache]: typeof symbol
}

export const idleCache: CacheState<any> = {
	status: "idle",
	[cache]: symbol,
}

export const pendingCache: CacheState<any> = {
	status: "pending",
	[cache]: symbol,
}
export function createRejectedCache(error: any): CacheState<any> {
	return {
		status: "rejected",
		error,
		[cache]: symbol,
	}
}
export function createFulfilledCache<T>(value: T): CacheState<T> {
	return {
		status: "fulfilled",
		value,
		[cache]: symbol,
	}
}

export type Idle = {
	status: "idle"
}
export type AtomStateStatus = Idle | Pending | SimpleRejected | { status: "fulfilled" }
export type CacheState<T> = (Idle | Pending | SimpleRejected | Fulfilled<T>) & IsCache

export interface Cache<T> extends Observable<Wrapped<T>> {
	get: (force?: boolean) => Promise<T>
	set: (value: T) => void
	modifyIfFulfilled: (updateFn: (currentValue: T) => T) => void
	clear: () => void
	atom: Atom<CacheState<T>>
	valueAtom: Atom<T>
}
