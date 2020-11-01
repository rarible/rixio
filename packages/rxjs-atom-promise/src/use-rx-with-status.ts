import { Observable } from "rxjs"
import { useSubscription, getImmediate } from "@rixio/rxjs-react"
import { useState } from "react"
import {
	createPromiseStateFulfilled,
	createPromiseStatePending,
	createPromiseStateRejected,
	PromiseState,
} from "./promise-state"

export function useRxWithStatus<T>(observable: Observable<T>): PromiseState<T> {
	const [state, setState] = useState<PromiseState<T>>(() => {
		const [value, valueSet] = getImmediate(observable)
		if (valueSet) return createPromiseStateFulfilled(value as T)
		return createPromiseStatePending()
	})
	useSubscription(observable, {
		next(value: T): void {
			setState(createPromiseStateFulfilled(value))
		},
		error(err: any): void {
			setState(createPromiseStateRejected(err))
		},
	})
	return state
}
