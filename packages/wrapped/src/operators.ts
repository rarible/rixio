import {
	combineLatest as rxjsCombineLatest,
	EMPTY,
	from as rxjsFrom,
	NEVER,
	Observable,
	of,
	throwError,
	defer as rxjsDefer,
	ObservableInput,
	ObservedValueOf,
} from "rxjs"
import {
	distinctUntilChanged,
	map as rxjsMap,
	mergeMap as rxjsMergeMap,
	switchMap as rxjsSwitchMap,
} from "rxjs/operators"

import {
	createFulfilledWrapped,
	createRejectedWrapped,
	pendingWrapped as wrappedPending,
	Rejected,
	Wrapped,
	WrappedObservable,
} from "./domain"
import { toWrapped } from "./utils"
import { markWrappedObservable, wrap } from "./index"

type F<T, R> = (value: T) => R

export function map<T, R>(mapper: (value: T) => R): F<WrappedObservable<T>, Observable<Wrapped<R>>> {
	return observable =>
		markWrappedObservable(
			wrap(observable).pipe(
				rxjsMap(v => {
					if (v.status === "fulfilled") {
						try {
							return createFulfilledWrapped(mapper(v.value))
						} catch (error) {
							return createRejectedWrapped(error)
						}
					}
					return v
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
	if (array.length === 0) {
		return of(toWrapped([])) as Observable<Wrapped<InferFromTuple<Ts>>>
	}
	return markWrappedObservable(
		rxjsCombineLatest(array.map(wrap)).pipe(
			rxjsMap(resultArray => {
				if (resultArray.length === 0) {
					return createFulfilledWrapped([])
				}
				let pending = false
				const rejected: Rejected[] = []
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
					return createRejectedWrapped(rejected[0].error, () => {
						rejected.forEach(r => r.reload())
					})
				}
				if (pending) {
					return wrappedPending
				}
				return createFulfilledWrapped(combined)
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
							return wrap(rxjsFrom(mapper(x.value)))
					}
				}),
				distinctUntilChanged()
			)
		)
}

export function switchMap<T, R>(
	mapper: (value: T) => WrappedObservable<R> | PromiseLike<R>
): F<WrappedObservable<T>, Observable<Wrapped<R>>> {
	return observable =>
		markWrappedObservable(
			wrap(observable).pipe(
				rxjsSwitchMap(x => {
					switch (x.status) {
						case "pending":
							return of(wrappedPending)
						case "rejected":
							return of(x)
						case "fulfilled":
							return wrap(rxjsFrom(mapper(x.value)))
					}
				}),
				distinctUntilChanged()
			)
		)
}

export function filter<T>(
	predicate: (value: T, index: number) => boolean
): F<WrappedObservable<T>, Observable<Wrapped<T>>> {
	return observable => {
		let index = 0
		return observable.pipe(
			flatMap(x => {
				if (predicate(x, index)) {
					index = index + 1
					return of(x)
				}
				return EMPTY
			})
		)
	}
}

export function catchError<T, R>(
	mapper: (value: any) => WrappedObservable<R> | R
): F<WrappedObservable<T>, Observable<Wrapped<R>>> {
	return observable =>
		markWrappedObservable(
			wrap(observable).pipe(
				rxjsMergeMap(v => {
					switch (v.status) {
						case "fulfilled":
							return of(v)
						case "pending":
							return of(wrappedPending)
						case "rejected":
							const result = mapper(v.error)
							if (result instanceof Observable) {
								return wrap(result)
							}
							return wrap(of(createFulfilledWrapped(result)))
					}
				})
			)
		)
}

export function unwrap<T>(): F<WrappedObservable<T>, Observable<T>> {
	return observable =>
		wrap(observable).pipe(
			rxjsMergeMap(v => {
				switch (v.status) {
					case "fulfilled":
						return of(v.value)
					case "pending":
						return NEVER
					case "rejected": {
						return throwError(v.error)
					}
				}
			})
		)
}

export function from<T extends ObservableInput<any>>(input: T): Observable<Wrapped<ObservedValueOf<T>>> {
	return markWrappedObservable(wrap(rxjsFrom(input)))
}

export function fromPromise<T>(promise: PromiseLike<T>): Observable<Wrapped<T>> {
	return from(promise)
}

export function defer<T extends ObservableInput<any> | void>(input: () => T): Observable<Wrapped<ObservedValueOf<T>>> {
	return markWrappedObservable(wrap(rxjsDefer(input)))
}

export function cond<T>(ifTrue: T, ifFalse: T): F<WrappedObservable<any>, Observable<Wrapped<T>>> {
	return wrapped => markWrappedObservable(wrap(wrapped).pipe(map(value => (value ? ifTrue : ifFalse))))
}
