import { concat, Observable, of } from "rxjs"
import { getImmediate, useRx } from "@rixio/rxjs-react"
import { useMemo } from "react"
import { map, catchError } from "rxjs/operators"
import {
	createPromiseStateFulfilled,
	createPromiseStatePending,
	createPromiseStateRejected,
	PromiseState,
} from "./promise-state"

export function useRxWithStatus<T>(initial: Observable<T>): PromiseState<T> {
	const observable = useMemo(() => asPromiseState(initial), [initial])
	return useRx(observable)
}

function asPromiseState<T>(observable: Observable<T>): Observable<PromiseState<T>> {
	const immediate = getImmediate(observable)
	const result = observable.pipe(
		map(createPromiseStateFulfilled),
		catchError(err => of(createPromiseStateRejected<T>(err)))
	)
	if (immediate.status !== "pending") {
		return result
	} else {
		return concat(of(createPromiseStatePending<T>()), result)
	}
}
