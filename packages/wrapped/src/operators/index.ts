import * as rxjs from "rxjs"
import * as operators from "rxjs/operators"
import type { Wrapped } from "../domain"
import { WrappedFulfilled, WrappedRejected, WrappedPending } from "../domain"
import type { OWLike } from "../ow"
import { OW } from "../ow"
import { toWrapped } from "../utils"

type F<T, R> = (value: T) => R

export function map<T, R>(mapper: (value: T) => R): F<OWLike<T>, OW<R>> {
  return x =>
    new OW(x).pipe(
      operators.map(v => {
        if (v.status === "fulfilled") {
          try {
            return WrappedFulfilled.create(mapper(v.value))
          } catch (error) {
            return WrappedRejected.create(error)
          }
        }
        return v
      }),
    )
}

type InferFromTuple<T extends any[]> = {
  [I in keyof T]: T[I] extends OWLike<infer T> ? T : unknown
}
export function combineLatest<Ts extends [...OWLike<any>[]]>(array: [...Ts]): OW<InferFromTuple<Ts>> {
  if (array.length === 0) {
    return new OW([]) as unknown as OW<InferFromTuple<Ts>>
  }

  return rxjs.combineLatest(array.map(x => new OW(x))).pipe(
    operators.map(results => {
      let pending = false
      const rejected: WrappedRejected[] = []
      const combined = new Array(results.length) as InferFromTuple<Ts>
      results.forEach((w, i) => {
        switch (w.status) {
          case "pending":
            pending = true
            break
          case "rejected":
            rejected.push(w)
            break
          case "fulfilled":
            combined[i] = w.value
            break
          default:
            break
        }
      })
      if (rejected.length > 0) return WrappedRejected.create(rejected[0].error, () => rejected.forEach(r => r.reload()))
      if (pending) return WrappedPending.create()
      return WrappedFulfilled.create(combined)
    }),
  )
}

export function flatMap<T, R>(mapper: (value: T) => rxjs.ObservableInput<Wrapped<R> | R>): F<OWLike<T>, OW<R>> {
  return x =>
    new OW(x).pipe(
      operators.mergeMap(v => {
        switch (v.status) {
          case "pending":
          case "rejected":
            return rxjs.of(v)
          case "fulfilled":
            return rxjs.from(mapper(v.value)).pipe(operators.map(toWrapped))
          default:
            return rxjs.throwError(new UnknownWrappedStatus())
        }
      }),
    )
}

export function switchMap<T, R>(mapper: (value: T) => rxjs.ObservableInput<Wrapped<R> | R>): F<OWLike<T>, OW<R>> {
  return x =>
    new OW(x).pipe(
      operators.switchMap(v => {
        switch (v.status) {
          case "pending":
          case "rejected":
            return rxjs.of(v)
          case "fulfilled":
            return rxjs.from(mapper(v.value)).pipe(operators.map(toWrapped))
          default:
            return rxjs.throwError(new UnknownWrappedStatus())
        }
      }),
    )
}

export function filter<T>(predicate: (value: T, index: number) => boolean): F<OWLike<T>, OW<T>> {
  return x => {
    let index = 0
    return new OW(x).pipe(
      flatMap(x => {
        if (predicate(x, index)) {
          index = index + 1
          return rxjs.of(x)
        }
        return rxjs.EMPTY
      }),
    )
  }
}

export function catchError<T, O>(
  mapper: (error: unknown) => rxjs.ObservableInput<Wrapped<O> | O>,
): F<OWLike<T>, OW<T | O>> {
  return x =>
    new OW(x).pipe(
      operators.mergeMap(v => {
        switch (v.status) {
          case "fulfilled":
          case "pending":
            return rxjs.of(v)
          case "rejected":
            return rxjs.from(mapper(v.error)).pipe(operators.map(toWrapped))
          default:
            return rxjs.throwError(new UnknownWrappedStatus())
        }
      }),
    )
}

export function unwrap<T>(): F<OW<T>, rxjs.Observable<T>> {
  return x =>
    x.pipe(
      operators.mergeMap(v => {
        switch (v.status) {
          case "fulfilled":
            return rxjs.of(v.value)
          case "pending":
            return rxjs.NEVER
          case "rejected":
            return rxjs.throwError(v.error)
          default:
            return rxjs.throwError(new UnknownWrappedStatus())
        }
      }),
    )
}

export function from<T>(input: rxjs.ObservableInput<T>): OW<T> {
  return new OW(rxjs.from(input))
}

export function defer<T>(factory: () => rxjs.ObservableInput<T>): OW<T> {
  return new OW(rxjs.defer(factory))
}

class UnknownWrappedStatus extends Error {
  constructor() {
    super("Unknown Wrapped status")
    this.name = "UnknownWrappedStatus"
  }
}
