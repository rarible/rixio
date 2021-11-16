import { Observable } from "rxjs"
import { Fulfilled, Pending, Wrapped, SimpleRejected } from "@rixio/wrapped"
import { Atom } from "@rixio/atom"

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

export interface Cache<T> extends Observable<Wrapped<T>> {
	get(force?: boolean): Promise<T>
	set(value: T): void
	modifyIfFulfilled(updateFn: (currentValue: T) => T): void
	clear(): void
	atom: Atom<CacheState<T>>
}

export interface Memo<T> extends Observable<T> {
	get(force?: boolean): Promise<T>
	set(value: T): void
	modifyIfFulfilled(updateFn: (currentValue: T) => T): void
	clear(): void
	atom: Atom<CacheState<T>>
}

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

export interface KeyCache<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Cache<V>
}

export interface KeyMemo<K, V> {
	get(key: K, force?: boolean): Promise<V>
	set(key: K, value: V): void
	getAtom(key: K): Atom<CacheState<V>>
	single(key: K): Memo<V>
}
