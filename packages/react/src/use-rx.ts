import { useState, useMemo, useRef, useEffect } from "react";
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
import { Wrapped, wrap, WrappedObservable, toPlainOrThrow, pendingWrapped } from "@rixio/wrapped";
import { ReadOnlyAtom } from "@rixio/atom"
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

export function useRx<T>(observable: WrappedObservable<T>, deps: any[] = []): Wrapped<T> {
	const [, setCount] = useState<number>(0)
	const wrapped = useMemo(() => wrap(observable), [observable])
	const value = useRef<Wrapped<T>>(pendingWrapped)
	const initial = useRef(true)
	const sub = useMemo(() => wrapped.subscribe(next => {
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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}), [wrapped, ...deps])
	useEffect(() => {
		return () => sub.unsubscribe()
	}, [sub])
	initial.current = false
	return value.current
}

export function useRxOrThrow<T>(observable: WrappedObservable<T>): T {
	return toPlainOrThrow(useRx(observable))
}

export function useAtom<T>(atom: ReadOnlyAtom<T>): T {
	const [state, setState] = useState<T>(() => atom.get())
	useSubscription(atom, setState)
	return state
}
