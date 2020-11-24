import { useState, useMemo, useRef } from "react"
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
import { Wrapped, wrap, WrappedObservable } from "@rixio/rxjs-wrapped"
import { ReadOnlyAtom } from "@rixio/rxjs-atom"
import { toPlainOrThrow } from "../../rxjs-wrapped/src";
import { useSubscription } from "./use-subscription"

export type ImmediateFulfilled<T> = {
	status: "fulfilled"
	value: T
}

export type Immediate<T> = ImmediateFulfilled<T> | { status: "pending" } | { status: "rejected"; error: any }

export function getImmediate<T>(observable: Observable<T>): Immediate<T> {
	let immediate: Immediate<T> = { status: "pending" }
	observable.pipe(first()).subscribe(
		value => {
			immediate = { status: "fulfilled", value }
		},
		error => {
			immediate = { status: "rejected", error }
		}
	)
	return immediate
}

export function getImmediateOrThrow<T>(observable: Observable<T>): T {
	const immediate = getImmediate(observable)
	if (immediate.status === "rejected") {
		throw immediate.error
	}
	if (immediate.status !== "fulfilled") {
		throw new Error("Observable doesn't immediately emits value")
	}
	return immediate.value
}

export function useRx<T>(observable: WrappedObservable<T>): Wrapped<T> {
	const wrapped = useMemo(() => wrap(observable), [observable])
	const [state, setState] = useState<Wrapped<T>>(() => getImmediateOrThrow(wrapped))
	const ref = useRef<Wrapped<T>>()
	useSubscription(wrapped, value => {
		const current = ref.current
		if (current !== undefined) {
			if (current.status === "fulfilled") {
				if (value.status === "fulfilled" && value.value !== current.value) {
					ref.current = value
					setState(value)
				}
			} else {
				ref.current = value
				setState(value)
			}
		} else {
			ref.current = value
		}
	})
	return state
}

export function useRxOrThrow<T>(observable: WrappedObservable<T>): T {
	return toPlainOrThrow(useRx(observable))
}

export function useAtom<T>(atom: ReadOnlyAtom<T>): T {
	const [state, setState] = useState<T>(() => atom.get())
	useSubscription(atom, setState)
	return state
}
