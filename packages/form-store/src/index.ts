import type { Observable } from "rxjs"
import type { Atom } from "@rixio/atom"
import type { Lens } from "@rixio/lens"
import { map } from "rxjs/operators"
import type {
  Validate,
  ValidationResult,
  ValidationResultError,
  ValidationResultSuccess,
  ValidationResultValidating,
} from "./domain"
import { createValidationResult } from "./utils/create-validation-result"

export class FormStore<T> {
  readonly canSubmit$ = this.validationResult.pipe(map(x => x.status === "success"))
  private readonly bindCache: Map<keyof T, FormStore<any>> = new Map()

  constructor(public readonly value: Atom<T>, public readonly validationResult: Observable<ValidationResult<T>>) {}

  bind<K extends keyof T>(field: K, getCustomLens?: (key: K) => Lens<T, T[K]>): FormStore<T[K]> {
    const cached = this.bindCache.get(field)
    if (cached) return cached
    const lensed$ = getCustomLens ? this.value.lens(getCustomLens(field)) : this.value.lens(field)
    const created = new FormStore(lensed$, this.getChild(field))
    this.bindCache.set(field, created)
    return created
  }

  private getChild<K extends keyof T>(field: K): Observable<ValidationResult<T[K]>> {
    return this.validationResult.pipe(
      map(x => {
        if (x.status === "validating") {
          return { status: "validating" } as ValidationResultValidating
        }
        if (x.status === "error" && x.children?.[field]) {
          return x.children[field] as ValidationResultError<T[K]>
        }
        return { status: "success" } as ValidationResultSuccess
      }),
    )
  }

  static create<K>(value: Atom<K>, validate: Validate<K>) {
    return new FormStore(value, createValidationResult(value, validate))
  }
}

export * from "./is-submit-disabled"
export * from "./utils/validate-joi"
