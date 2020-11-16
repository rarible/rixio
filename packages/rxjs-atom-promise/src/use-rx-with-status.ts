import { Observable } from "rxjs"
import { useRx } from "@rixio/rxjs-react"
import { useMemo } from "react"
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
	return new Observable<PromiseState<T>>(s => {
		let emitted = false
		const subscription = observable.subscribe(
			value => {
				emitted = true
				s.next(createPromiseStateFulfilled(value))
			},
			error => {
				emitted = true
				s.next(createPromiseStateRejected(error))
			},
			() => {
				emitted = true
				s.complete()
			}
		)
		if (!emitted) {
			s.next(createPromiseStatePending<T>())
		}
		s.add(subscription)
	})
}
