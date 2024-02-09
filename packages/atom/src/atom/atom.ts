import { Observable, BehaviorSubject, Subscription } from "rxjs"
import { tap, share, filter } from "rxjs/operators"
import type { Atom as _Atom, ReadOnlyAtom } from "./base"
import { JsonAtom, CombinedAtomViewImpl } from "./base"

// a hack we need to do so we can merge the Atom type with
// the namespace below and then export it.
export type Atom<T> = _Atom<T>

export namespace Atom {
  /**
   * Create an atom with given initial value.
   *
   * @export
   * @template T type of atom values
   * @param initialValue initial value for this atom
   * @returns fresh atom
   */
  export function create<T>(initialValue: T): Atom<T> {
    return new JsonAtom(initialValue)
  }

  export function combine<T1, T2, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    combineFn: (x1: T1, x2: T2) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<T1, T2, T3, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    source3: ReadOnlyAtom<T3>,
    combineFn: (x1: T1, x2: T2, x3: T3) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<T1, T2, T3, T4, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    source3: ReadOnlyAtom<T3>,
    source4: ReadOnlyAtom<T4>,
    combineFn: (x1: T1, x2: T2, x3: T3, x4: T4) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<T1, T2, T3, T4, T5, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    source3: ReadOnlyAtom<T3>,
    source4: ReadOnlyAtom<T4>,
    source5: ReadOnlyAtom<T5>,
    combineFn: (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<T1, T2, T3, T4, T5, T6, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    source3: ReadOnlyAtom<T3>,
    source4: ReadOnlyAtom<T4>,
    source5: ReadOnlyAtom<T5>,
    source6: ReadOnlyAtom<T6>,
    combineFn: (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<T1, T2, T3, T4, T5, T6, T7, TResult>(
    source1: ReadOnlyAtom<T1>,
    source2: ReadOnlyAtom<T2>,
    source3: ReadOnlyAtom<T3>,
    source4: ReadOnlyAtom<T4>,
    source5: ReadOnlyAtom<T5>,
    source6: ReadOnlyAtom<T6>,
    source7: ReadOnlyAtom<T7>,
    combineFn: (x1: T1, x2: T2, x3: T3, x4: T4, x5: T5, x6: T6, x7: T7) => TResult,
  ): ReadOnlyAtom<TResult>

  export function combine<TResult>(...args: (ReadOnlyAtom<any> | ((...xs: any[]) => TResult))[]) {
    return new CombinedAtomViewImpl<TResult>(args.slice(undefined, -1) as ReadOnlyAtom<any>[], xs =>
      (args[args.length - 1] as (...xs: any[]) => TResult)(...xs),
    )
  }

  /**
   * Converts an observable to a read-only atom.
   *
   * The returned atom is wrapped into an observable, which will only emit a single value.
   * The source observable will only be subscribed to for as long as there is at least one
   * subscription to the returned observable.
   *
   * The returned observable never completes and controls the lifecycle of the emitted atom:
   * as long as it's subscribed to, the returned atom will have its value updated from the
   * source observable.
   *
   * @export
   * @template T type of atom values
   * @param source$ the source observable
   * @returns an observable that emits a read-only atom
   */
  export function fromObservable<T>(source$: Observable<T>) {
    const subject$ = new BehaviorSubject<Atom<T> | null>(null)

    const initAndUpdateAtom = source$.pipe(
      tap(x => {
        const atom = subject$.value

        if (atom === null) {
          subject$.next(Atom.create(x))
        } else {
          atom.set(x)
        }
      }),
      // prevent updating atom multiple times to the same value
      share(),
    )

    return new Observable<ReadOnlyAtom<T>>(o => {
      const sub = new Subscription()

      sub.add(subject$.pipe(filter((x): x is Atom<T> => !!x)).subscribe(o))
      sub.add(
        // It's necessary to use internal subscribe
        initAndUpdateAtom.subscribe({
          error: e => o.error(e),
          complete: () => o.complete(),
        }),
      )

      return sub
    })
  }

  export function set<T>(atom$: Atom<T>, source$: Observable<T>): Observable<void> {
    return new Observable(s => {
      const sub = source$.subscribe({
        next: next => atom$.set(next),
        error: e => s.next(e),
        complete: () => s.complete(),
      })
      s.add(sub)
    })
  }
}
