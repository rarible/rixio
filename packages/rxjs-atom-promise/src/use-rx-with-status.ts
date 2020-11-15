import { concat, Observable, of } from "rxjs"
import { getImmediate, useRx } from "@rixio/rxjs-react"
import { useMemo } from "react"
import { map, catchError } from "rxjs/operators"
import { createCacheStateFulfilled, createCacheStateRejected, WrappedRx, cacheStatusPending } from "./cache-state"

export function useRxWithStatus<T>(initial: Observable<T>): WrappedRx<T> {
	const observable = useMemo(() => asWrappedObservable(initial), [initial])
	return useRx(observable)
}

function asWrappedObservable<T>(observable: Observable<T>): Observable<WrappedRx<T>> {
	const immediate = getImmediate(observable)
	const result = observable.pipe(
		map(createCacheStateFulfilled),
		catchError(err => of(createCacheStateRejected<T>(err)))
	)
	if (immediate.status !== "pending") {
		return result
	} else {
		return concat(of(cacheStatusPending as WrappedRx<T>), result)
	}
}
