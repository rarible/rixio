import { useState } from "react"
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
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

export function useRxWithStatus<T>(observable: Observable<T>): LoadingState<T> {
	const [state, setState] = useState<LoadingState<T>>(() => {
		const [value, valueSet] = getImmediate(observable)
		if (valueSet) return createLoadingStateSuccess(value as T)
		return createLoadingStateLoading()
	})
	useSubscription(observable, {
		next(value: T): void {
			setState(createLoadingStateSuccess(value))
		},
		error(err: any): void {
			setState(createLoadingStateError(err))
		},
	})
	return state
}
