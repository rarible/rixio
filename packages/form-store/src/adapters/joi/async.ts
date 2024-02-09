import type { ObjectSchema, ValidationOptions } from "joi"
import type { Observable } from "rxjs"
import { concat, of } from "rxjs"
import { catchError, shareReplay, switchMap } from "rxjs/operators"
import type {
  ValidationResult,
  ValidationResultError,
  ValidationResultSuccess,
  ValidationResultValidating,
} from "../../domain"
import { isJoiError, mapJoiError } from "./utils"

export function validateJoiAsync<T extends object>(
  schema: ObjectSchema<T>,
  options: ValidationOptions = {},
): (value: T) => Observable<ValidationResult<T>> {
  return (value: T): Observable<ValidationResult<T>> =>
    concat(
      of<ValidationResultValidating>({
        status: "validating",
        value,
      }),
      of(null).pipe(
        switchMap(() =>
          schema.validateAsync(value, {
            abortEarly: false,
            stripUnknown: true,
            ...options,
          }),
        ),
        switchMap(x =>
          of<ValidationResultSuccess<T>>({
            status: "success",
            value: x,
          }),
        ),
        catchError(error => {
          if (isJoiError(error)) {
            return of(mapJoiError(value, error))
          }
          return of<ValidationResultError<T>>({
            error,
            status: "error",
            value,
            children: {},
          })
        }),
      ),
    ).pipe(shareReplay(1))
}
