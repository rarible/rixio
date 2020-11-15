import React, { MutableRefObject, ReactNode, useCallback, useEffect, useMemo } from "react"
import { useRxChange, useRx } from "@rixio/rxjs-react"
import { map } from "rxjs/operators"
import { Observable, combineLatest } from "rxjs"
import { Rx, RxProps, OrReactChild } from "./rx"
import { mergePromiseStates } from "./merge"
import { save } from "./save"
import { CacheStatus, WrappedRx } from "./cache-state"

type CacheablePropsBase = Omit<RxProps<any>, "value$" | "rejected" | "children"> & {
	rejected?: OrReactChild<(error: any, load: () => void) => ReactNode>
	reloadRef?: MutableRefObject<() => void>
}

type WrappedObservable<T> = Observable<WrappedRx<T>>

type Cacheable1Props<T> = {
	cache: WrappedObservable<T>
	children?: OrReactChild<(value: T, reload: () => {}) => ReactNode>
} & CacheablePropsBase

type Cacheable2Props<T1, T2> = {
	cache: [WrappedObservable<T1>, WrappedObservable<T2>]
	children?: OrReactChild<(value: [T1, T2], reload: () => {}) => ReactNode>
} & CacheablePropsBase

type Cacheable3Props<T1, T2, T3> = {
	cache: [WrappedObservable<T1>, WrappedObservable<T2>, WrappedObservable<T3>]
	children?: OrReactChild<(value: [T1, T2, T3], reload: () => {}) => ReactNode>
} & CacheablePropsBase

type Cacheable4Props<T1, T2, T3, T4> = {
	cache: [WrappedObservable<T1>, WrappedObservable<T2>, WrappedObservable<T3>, WrappedObservable<T4>]
	children?: OrReactChild<(value: [T1, T2, T3, T4], reload: () => {}) => ReactNode>
} & CacheablePropsBase

type Cacheable5Props<T1, T2, T3, T4, T5> = {
	cache: [WrappedObservable<T1>, WrappedObservable<T2>, WrappedObservable<T3>, WrappedObservable<T4>, WrappedObservable<T5>]
	children?: OrReactChild<(value: [T1, T2, T3, T4, T5], reload: () => {}) => ReactNode>
} & CacheablePropsBase

type CacheableProps = {
	cache: any
	children?: any
} & CacheablePropsBase

export function Cacheable<T>(props: Cacheable1Props<T>): React.ReactElement | null
export function Cacheable<T1, T2>(props: Cacheable2Props<T1, T2>): React.ReactElement | null
export function Cacheable<T1, T2, T3>(props: Cacheable3Props<T1, T2, T3>): React.ReactElement | null
export function Cacheable<T1, T2, T3, T4>(props: Cacheable4Props<T1, T2, T3, T4>): React.ReactElement | null
export function Cacheable<T1, T2, T3, T4, T5>(props: Cacheable5Props<T1, T2, T3, T4, T5>): React.ReactElement | null
export function Cacheable({
	cache,
	children,
	rejected,
	reloadRef,
	...rest
}: CacheableProps): React.ReactElement | null {
	const caches = useCaches(cache)
	const single = useMemo(() => combineLatest(caches), [caches])
	const values = useRx(single)



	return <Rx value$={single} {...rest} rejected={newRejected} children={newChildren} />
}



function getCaches(cache: any): WrappedObservable<any>[] {
	if (Array.isArray(cache)) {
		return cache
	} else {
		return [cache]
	}
}

function useCaches(cache: any) {
	const array = getCaches(cache)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => array, array)
}

function load(caches: Cache<any>[], ...statuses: CacheStatus["status"][]) {
	caches.forEach(c => {
		let status = c.atom.get().status
		if (statuses.indexOf(status) !== -1) {
			save(c.load(), c.atom).then()
		}
	})
}
