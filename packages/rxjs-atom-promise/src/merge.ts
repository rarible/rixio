import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import {
	PromiseState,
	PromiseStatus,
	promiseStatusIdle,
	promiseStatusPending,
	promiseStatusFulfilled,
} from "./promise-state"

export function mergePromiseStates(array: Observable<PromiseState<any>>[]): Observable<PromiseState<any>> {
	return combineLatest(array).pipe(
		map(xs => ({ value: xs.map(x => x.value), ...mergePromiseStatuses(xs) })),
	)
}

export function mergePromiseStatuses(statuses: PromiseStatus[]): PromiseStatus {
	const firstRejected = statuses.find(x => x.status === "rejected")
	if (firstRejected) {
		return firstRejected
	}
	if (statuses.some(({ status }) => status === "pending")) {
		return promiseStatusPending
	}
	if (statuses.some(({ status }) => status === "idle")) {
		return promiseStatusIdle
	}
	return promiseStatusFulfilled
}

export function mergeStatuses(statuses: Observable<PromiseStatus>[]) {
	return combineLatest(statuses).pipe(
		map(mergePromiseStatuses),
	)
}
