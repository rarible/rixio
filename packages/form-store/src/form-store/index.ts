import type { Observable } from "rxjs"
import type { Atom } from "@rixio/atom"
import { map, shareReplay, switchMap, throttleTime } from "rxjs/operators"
import type { ValidateFn, ValidationResult } from "../domain"
import { validationResultToObservable } from "../utils/to-observable"

export class FormStore<T> {
  readonly canSubmit$ = this.validationResult.pipe(map(x => x.status === "success"))
  private readonly bindCache: Map<keyof T, FormStore<any>> = new Map()

  constructor(public readonly value: Atom<T>, public readonly validationResult: Observable<ValidationResult<T>>) {}

  bind = <K extends keyof T, R extends T[K]>(field: K): FormStore<R> => {
    const cached = this.bindCache.get(field)
    if (cached) return cached
    const lensed$ = this.value.lens(field)
    const created = new FormStore(lensed$, this.getChild(field))
    this.bindCache.set(field, created)
    return created as FormStore<R>
  }

  lens = <J extends keyof T, R extends T[J]>(
    field: J,
    buildLens: (field: J, value: Atom<T>) => Atom<R>,
  ): FormStore<R> => {
    const lensed$ = buildLens(field, this.value)
    return new FormStore(lensed$, this.getChild(field))
  }

  private getChild<K extends keyof T, R extends T[K]>(field: K): Observable<ValidationResult<R>> {
    return this.validationResult.pipe(
      map(result => {
        if (result.status === "validating") {
          return { ...result }
        }
        if (result.status === "error" && result.children[field]) {
          return { ...result.children[field] } as ValidationResult<R>
        }
        return {
          status: "success",
          value: result.value as R,
        }
      }),
    )
  }

  static create<K>(value: Atom<K>, validate: ValidateFn<K>) {
    const validation$ = value.pipe(
      throttleTime(500, undefined, {
        leading: true,
        trailing: true,
      }),
      switchMap(x => validationResultToObservable(x, validate(x))),
      shareReplay(1),
    )
    return new FormStore(value, validation$)
  }
}
