import { Observable, concat, of } from "rxjs"
import { map, catchError } from "rxjs/operators"
import { useRx } from "@grecha/rxjs-react"
import {
	PromiseState,
	createPromiseStatePending,
	createPromiseStateFulfilled,
	createPromiseStateRejected,
} from "./promise-state"
import { useMemo } from "react"

export function useRxWithStatus<T>(initial: Observable<T>): PromiseState<T> {
	const observable = useMemo(() => asPromiseState(initial), [initial])
	return useRx(observable)
}

function asPromiseState<T>(observable: Observable<T>): Observable<PromiseState<T>> {
	return concat(
		of(createPromiseStatePending<T>()),
		observable.pipe(
			map(createPromiseStateFulfilled),
			catchError(err => of(createPromiseStateRejected<T>(err))),
		),
	)
}
