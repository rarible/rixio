import { useMemo, useState } from "react"
import { concat, Observable, of } from "rxjs"
import { catchError, first, map } from "rxjs/operators"
import { useSubscription } from "./use-subscription"
import {
	createLoadingStateError,
	createLoadingStateLoading,
	createLoadingStateSuccess,
	LoadingState,
} from "@grecha/rxjs-atom-loader/src/loading-state"

export function getImmediate<T>(observable: Observable<T>): [T | null, boolean] {
	let value: T | null = null
	let valueSet: boolean = false
	observable.pipe(first()).subscribe(next => {
		value = next
		valueSet = true
	})
	return [value, valueSet]
}

export function getImmediateOrThrow<T>(observable: Observable<T>): T {
	const [value, valueSet] = getImmediate(observable)
	if (!valueSet) {
		throw new Error("Observable doesn't immediately emits value")
	}
	return value as T
}

export function useRx<T>(observable: Observable<T>): T {
	const [state, setState] = useState<T>(() => getImmediateOrThrow(observable))
	useSubscription(observable, setState)
	return state
}

export function useRxWithStatus<T>(initial: Observable<T>): LoadingState<T> {
	const observable = useMemo(() => withLoading(initial), [initial])
	return useRx(observable)
}

function withLoading<T>(observable: Observable<T>): Observable<LoadingState<T>> {
	return concat(
		of(createLoadingStateLoading<T>()),
		observable.pipe(
			map(createLoadingStateSuccess),
			catchError(err => of(createLoadingStateError<T>(err))),
		),
	)
}
