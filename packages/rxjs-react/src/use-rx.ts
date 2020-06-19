import { useState } from "react"
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
import { useSubscription } from "./use-subscription"

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
