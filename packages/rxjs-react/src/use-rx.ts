import { useState } from "react"
import { Observable } from "rxjs"
import { first } from "rxjs/operators"
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

export function useRx<T>(observable: Observable<T>): T {
	const [state, setState] = useState<T>(() => getImmediateOrThrow(observable))
	useSubscription(observable, setState)
	return state
}
