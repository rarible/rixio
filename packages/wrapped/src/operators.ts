import { combineLatest as rxjsCombineLatest, from, Observable, of } from "rxjs"
import { distinctUntilChanged, map as rxjsMap, mergeMap as rxjsMergeMap } from "rxjs/operators"
import {
	createFulfilledWrapped,
	createRejectedWrapped,
	pendingWrapped as wrappedPending,
	Rejected,
	Wrapped,
	WrappedObservable,
} from "./domain"
import { markWrappedObservable, wrap } from "./index";

type F<T, R> = (value: T) => R

export function map<T, R>(mapper: (value: T) => R): F<WrappedObservable<T>, Observable<Wrapped<R>>> {
	return observable =>
		markWrappedObservable(
			wrap(observable).pipe(
				rxjsMap(v => {
					switch (v.status) {
						case "fulfilled":
							return createFulfilledWrapped(mapper(v.value))
						case "pending":
							return v
						case "rejected":
							return v
					}
				})
			)
		)
}

type InferFromTuple<T extends any[]> = {
	[I in keyof T]: T[I] extends WrappedObservable<infer T> ? T : unknown
}
export function combineLatest<Ts extends [...WrappedObservable<any>[]]>(
	array: [...Ts]
): Observable<Wrapped<InferFromTuple<Ts>>> {
	return markWrappedObservable(
		rxjsCombineLatest(array.map(wrap)).pipe(
			rxjsMap(resultArray => {
				let pending = false
				let rejected: Rejected[] = []
				const combined = new Array(resultArray.length)
				resultArray.forEach((w, idx) => {
					switch (w.status) {
						case "pending":
							pending = true
							break
						case "rejected":
							rejected.push(w)
							break
						case "fulfilled":
							combined[idx] = w.value
					}
				})
				if (rejected.length > 0) {
					const error = rejected[0].error
					const reload = () => {
						rejected.forEach(r => r.reload())
					}
					return createRejectedWrapped(error, reload)
				} else if (pending) {
					return wrappedPending
				} else {
					return createFulfilledWrapped(combined)
				}
			}),
			distinctUntilChanged()
		)
	)
}

export function flatMap<T, R>(
	mapper: (value: T) => WrappedObservable<R> | PromiseLike<R>
): F<WrappedObservable<T>, Observable<Wrapped<R>>> {
	return observable =>
		markWrappedObservable(
			wrap(observable).pipe(
				rxjsMergeMap(x => {
					switch (x.status) {
						case "pending":
							return of(wrappedPending)
						case "rejected":
							return of(x)
						case "fulfilled":
							return wrap(from(mapper(x.value)))
					}
				}),
				distinctUntilChanged()
			)
		)
}

export function fromPromise<T>(promise: PromiseLike<T>): Observable<Wrapped<T>> {
	return wrap(from(promise))
}

export function cond<T>(ifTrue: T, ifFalse: T): F<WrappedObservable<any>, Observable<Wrapped<T>>> {
	return wrapped => markWrappedObservable(
		wrap(wrapped).pipe(map(value => (value ? ifTrue : ifFalse)))
	)
}
