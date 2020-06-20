import { combineLatest, Observable } from "rxjs"
import {
	LoadingState,
	LoadingStatus,
	loadingStatusIdle,
	loadingStatusLoading,
	loadingStatusSuccess,
} from "./loading-state"
import { map } from "rxjs/operators"

export function mergeLoadingStates(array: Observable<LoadingState<any>>[]): Observable<LoadingState<any>> {
	return combineLatest(array).pipe(
		map(xs => ({ value: xs.map(x => x.value), ...mergeStatusesPlain(xs) })),
	)
}

export function mergeStatusesPlain(statuses: LoadingStatus[]): LoadingStatus {
	const firstError = statuses.find(x => x.status === "error")
	if (firstError) {
		return firstError
	}
	if (statuses.some(({ status }) => status === "loading")) {
		return loadingStatusLoading
	}
	if (statuses.some(({ status }) => status === "idle")) {
		return loadingStatusIdle
	}
	return loadingStatusSuccess
}

export function mergeStatuses(statuses: Observable<LoadingStatus>[]) {
	return combineLatest(statuses).pipe(
		map(mergeStatusesPlain),
	)
}
