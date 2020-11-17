import { Observable } from "rxjs"
import { createFulfilled, createRejected, isWrapped, pending, Wrapped, WrappedObservable } from "./domain"

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
				s.next(createRejected(error))
			},
			() => {
				got = true
				s.complete()
			}
		)
		if (!got) {
			s.next(pending)
		}
		s.add(subscription)
	})
}

function toWrapped<T>(value: T | Wrapped<T>): Wrapped<T> {
  if (isWrapped(value)) {
    return value as Wrapped<T>
  } else {
    return createFulfilled(value) as Wrapped<T>
  }
}

export * from "./domain"
