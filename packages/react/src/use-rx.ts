import { useState, useMemo, useRef, useEffect } from "react"
import type { Observable } from "rxjs"
import { first } from "rxjs/operators"
import {
	Wrapped,
	wrap,
	WrappedObservable,
	toPlainOrThrow,
	pendingWrapped,
	createFulfilledWrapped,
	createRejectedWrapped,
} from "@rixio/wrapped"
import type { ReadOnlyAtom } from "@rixio/atom"
import { useSubscription } from "./use-subscription"

export function getImmediate<T>(observable: Observable<T>): Wrapped<T> {
	let immediate: Wrapped<T> = pendingWrapped
	observable.pipe(first()).subscribe(
		value => (immediate = createFulfilledWrapped(value)),
		error => (immediate = createRejectedWrapped(error))
	)
	return immediate
}

export function getImmediateOrThrow<T>(observable: Observable<T>): T {
	const immediate = getImmediate(observable)
	if (immediate.status === "rejected") {
		throw immediate.error
	}
	if (immediate.status === "fulfilled") {
		return immediate.value
	}
	throw new Error("Observable doesn't immediately emits value")
}

/**
 * Return wrapped value from observable or wrapped observable
 * @param observable observable to watch
 * @param deps additional dependencies for reconcile subscription, by default [observable]
 * @returns
 */
export function useRx<T>(observable: WrappedObservable<T>, deps: any[] = [observable]): Wrapped<T> {
	const [, setCount] = useState<number>(0)
	const wrapped = useMemo(() => wrap(observable), [observable])
	const value = useRef<Wrapped<T>>(pendingWrapped)
	const initial = useRef(true)
	const sub = useMemo(
		() =>
			wrapped.subscribe(next => {
				const current = value.current
				value.current = next
				if (!initial.current) {
					if (
						current.status !== next.status ||
						(current.status === "fulfilled" && next.status === "fulfilled" && current.value !== next.value)
					) {
						setCount(c => c + 1)
					}
				}
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		deps
	)
	useEffect(() => () => sub.unsubscribe(), [sub])
	initial.current = false
	return value.current
}

/**
 * Unwraps wrapped observable or wrapped observable or throw error if it's not fulfilled
 * Observable must emit value Immediately
 * @param observable
 * @returns unwrapped value from observable
 */
export function useRxOrThrow<T>(observable: WrappedObservable<T>): T {
	return toPlainOrThrow(useRx(observable))
}

/**
 * Unwraps Atom and returns current value
 * @param atom
 * @returns value of current atom
 */
export function useAtom<T>(atom: ReadOnlyAtom<T>): T {
	const [state, setState] = useState<T>(() => atom.get())
	useSubscription(atom, setState)
	return state
}
