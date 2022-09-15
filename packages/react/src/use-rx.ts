import { useState, useMemo, useRef, useEffect } from "react"
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
import { Wrapped, toPlainOrThrow, WrappedFulfilled, WrappedRejected, WrappedPending, OWLike, OW } from "@rixio/wrapped"
import { ReadOnlyAtom } from "@rixio/atom"
import { useSubscription } from "./use-subscription"

export function getImmediate<T>(observable: Observable<T>): Wrapped<T> {
	let immediate: Wrapped<T> = WrappedPending.create()
	observable.pipe(first()).subscribe(
		value => (immediate = WrappedFulfilled.create(value)),
		error => (immediate = WrappedRejected.create(error))
	)
	return immediate
}

export function getImmediateOrThrow<T>(observable: Observable<T>): T {
	const immediate = getImmediate(observable)
	if (immediate.status === "rejected") throw immediate.error
	if (immediate.status !== "fulfilled") throw new Error("Observable doesn't immediately emits value")
	return immediate.value
}

export function useRx<T>(observable: OWLike<T>, deps: any[] = [observable]): Wrapped<T> {
	const [, setCount] = useState<number>(0)
	const value = useRef<Wrapped<T>>(WrappedPending.create())
	const initial = useRef(true)
	const memoized = useMemo(() => new OW(observable), [observable])

	const sub = useMemo(
		() =>
			memoized.subscribe(next => {
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

export function useRxOrThrow<T>(observable: OWLike<T>): T {
	return toPlainOrThrow(useRx(observable))
}

export function useAtom<T>(atom: ReadOnlyAtom<T>): T {
	const [state, setState] = useState<T>(() => atom.get())
	useSubscription(atom, setState)
	return state
}
