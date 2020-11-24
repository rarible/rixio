import { Observable, of } from "rxjs"
import {
	createFulfilledWrapped,
	createRejectedWrapped,
	isWrapped,
	pendingWrapped,
	Wrapped,
	WrappedObservable,
	ObservableLike,
} from "./domain"

export function toObservable<T>(like: ObservableLike<T>): Observable<Wrapped<T>> {
	if (like instanceof Observable) {
		return wrap(like)
	} else {
		return of(toWrapped(like))
	}
}

export function wrap<T>(observable: WrappedObservable<T>): Observable<Wrapped<T>> {
	return new Observable(s => {
		let got = false
		const subscription = observable.subscribe(
			value => {
				got = true
				s.next(toWrapped(value))
			},
			error => {
				got = true
				s.next(createRejectedWrapped(error))
			},
			() => {
				got = true
				s.complete()
			}
		)
		if (!got) {
			s.next(pendingWrapped)
		}
		s.add(subscription)
	})
}

export function toWrapped<T>(value: T | Wrapped<T>): Wrapped<T> {
	if (isWrapped(value)) {
		return value as Wrapped<T>
	} else {
		return createFulfilledWrapped(value) as Wrapped<T>
	}
}

export function toPlainOrThrow<T>(value: Wrapped<T>): T {
	if (value.status === "fulfilled") {
		return value.value
	}
	throw new Error("not fulfilled")
}

export {
	WrappedObservable,
	pendingWrapped,
	createFulfilledWrapped,
	createRejectedWrapped,
	Fulfilled,
	isWrapped,
	Pending,
	SimpleRejected,
	Rejected,
	Wrapped,
	ObservableLike,
} from "./domain"
export { cond, combineLatest, fromPromise, map, flatMap } from "./operators"
