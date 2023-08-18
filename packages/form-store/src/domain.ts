import type { Observable } from "rxjs"

export interface ValidationResultValidating {
  status: "validating"
}

export interface ValidationResultSuccess {
  status: "success"
}

export interface ValidationResultError<T> {
  status: "error"
  error: string
  children: {
    [P in keyof T]+?: ValidationResult<T[P]>
  }
}

export type ValidationResult<T> = ValidationResultSuccess | ValidationResultValidating | ValidationResultError<T>

export type Validate<T> = (
  value: T,
) => ValidationResult<T> | PromiseLike<ValidationResult<T>> | Observable<ValidationResult<T>>

export type ValidationStatus = ValidationResult<any>["status"]
