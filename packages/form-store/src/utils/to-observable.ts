import type { Observable } from "rxjs"
import { concat, from, of } from "rxjs"
import { switchMap } from "rxjs/operators"
import type { ValidateFnResult, ValidationResult, ValidationResultValidating } from "../domain"

export function validationResultToObservable<T>(
  value: T,
  result: ValidateFnResult<T>,
): Observable<ValidationResult<T>> {
  if ("then" in result || "subscribe" in result) {
    return concat(
      of<ValidationResultValidating>({
        status: "validating",
        value,
      }),
      of(null).pipe(switchMap(() => from(result))),
    )
  }
  return of(result)
}
