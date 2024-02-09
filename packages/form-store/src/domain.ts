import type { Observable } from "rxjs"

export interface ValidationResultValidating {
  status: "validating"
  value: unknown
}

export interface ValidationResultSuccess<T> {
  status: "success"
  value: T
}

export interface ValidationResultError<T> {
  status: "error"
  error: string
  value: unknown | undefined
  children: Partial<{
    [P in keyof T]: ValidationResult<T[P]>
  }>
}

export type ValidationResultFinal<T> = ValidationResultSuccess<T> | ValidationResultError<T>

export type ValidationResult<T> = ValidationResultFinal<T> | ValidationResultValidating

export type ValidateFnResult<T> =
  | ValidationResultFinal<T>
  | PromiseLike<ValidationResultFinal<T>>
  | Observable<ValidationResult<T>>

export type ValidateFn<T> = (value: T) => ValidateFnResult<T>
