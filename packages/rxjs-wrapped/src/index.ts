import { Observable } from "rxjs"
import { createFulfilledWrapped, createRejectedWrapped, isWrapped, pendingWrapped, Wrapped, WrappedObservable } from "./domain"

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

function toWrapped<T>(value: T | Wrapped<T>): Wrapped<T> {
  if (isWrapped(value)) {
    return value as Wrapped<T>
  } else {
    return createFulfilledWrapped(value) as Wrapped<T>
  }
}

export * from "./domain"
