import { Observable } from "rxjs"
import type { Wrapped } from "../domain"
import { WrappedBase, WrappedFulfilled, WrappedPending, WrappedRejected } from "../domain"

export type OWLike<T> = T | Observable<Wrapped<T> | T>

export class OW<T> extends Observable<Wrapped<T>> {
  constructor(original: OWLike<T>) {
    super(s => {
      if (original instanceof Observable) {
        let got = false
        const subscription = original.subscribe(
          value => {
            got = true
            if (value instanceof WrappedBase) {
              s.next(value)
            } else {
              s.next(WrappedFulfilled.create(value))
            }
          },
          error => {
            got = true
            s.next(WrappedRejected.create(error))
          },
          () => {
            got = true
            s.complete()
          },
        )
        if (!got) {
          s.next(WrappedPending.create())
        }
        s.add(subscription)
      } else {
        s.next(WrappedFulfilled.create(original))
      }
    })
  }
}
