import { Observable } from "rxjs"
import { Atom } from "@rixio/rxjs-atom"

const wrappedRx = Symbol.for("wrappedRx")

export function isWrappedRx(value: any) {
	return value.___flag___ === wrappedRx
}

export function wrap<T>(value: T | WrappedRx<T>): WrappedRx<T> {
	if (isWrappedRx(value)) {
		return value as WrappedRx<T>
	} else {
		return createCacheStateFulfilled(value) as WrappedRx<T>
	}
}

type WithFlag = { ___flag___: typeof wrappedRx }

export type CacheStatusIdle = {
	status: "idle"
}
export type CacheStatusFulfilled = {
	status: "fulfilled"
}
export type CacheStatusPending = {
	status: "pending"
}
export type CacheStatusRejected = {
	status: "rejected"
	error: any
	cache?: Cache<any>
}
type State<Status, T> = Status & WithFlag & { value: T }
export type StateIdle<T> = State<CacheStatusIdle, T>
export type StatePending<T> = State<CacheStatusPending, T>
export type StateRejected<T> = State<CacheStatusRejected, T>
export type StateFulfilled<T> = State<CacheStatusFulfilled, T>

export const cacheStatusIdle: CacheStatusIdle & WithFlag = {
	___flag___: wrappedRx,
	status: "idle",
}
export const cacheStatusPending: CacheStatusPending & WithFlag = {
	___flag___: wrappedRx,
	status: "pending",
}
export const cacheStatusFulfilled: CacheStatusFulfilled & WithFlag = {
	___flag___: wrappedRx,
	status: "fulfilled",
}
export const createCacheStatusRejected = <T>(error: T, cache?: Cache<any>): CacheStatusRejected & WithFlag => ({
	___flag___: wrappedRx,
	status: "rejected",
	error,
	cache
})

export type WrappedRxStatus = CacheStatusRejected | CacheStatusFulfilled | CacheStatusPending
export type CacheStatus = CacheStatusIdle | WrappedRxStatus

export type WrappedRx<T> = StatePending<T> | StateRejected<T> | StateFulfilled<T>
export type CacheState<T> = WrappedRx<T> | StateIdle<T>

export const createCacheStateIdle = <T>(emptyValue?: T): StateIdle<T> => emptyValue
	? { value: emptyValue, ...cacheStatusIdle }
	: cacheStatusIdle as StateIdle<T>

export const createCacheStateFulfilled = <T>(value: T): StateFulfilled<T> => ({
	value,
	...cacheStatusFulfilled,
})
export const createCacheStateRejected = <T>(error: any, cache?: Cache<any>, emptyValue?: T): StateRejected<T> => ({
	value: emptyValue as T,
	...createCacheStatusRejected(error, cache),
})
export const createCacheStatePending = <T>(emptyValue?: T): CacheState<T> => emptyValue
	? { value: emptyValue, ...cacheStatusPending }
	: cacheStatusPending as CacheState<T>

export interface Cache<T> extends Observable<WrappedRx<T>> {
	get(force?: boolean): Promise<T>

	set(value: T): void

	modifyIfFulfilled(updateFn: (currentValue: T) => T): void

	clear(): void

	atom: Atom<CacheState<T>>
}

export type WrappedObservable<T> = Observable<T | WrappedRx<T>>
