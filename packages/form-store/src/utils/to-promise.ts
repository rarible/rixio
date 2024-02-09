import { EMPTY, of } from "rxjs"
import { switchMap, take } from "rxjs/operators"
import type { ValidateFnResult, ValidationResultFinal } from "../domain"

export function validationResultToPromise<T>(result: ValidateFnResult<T>): Promise<ValidationResultFinal<T>> {
  if ("subscribe" in result) {
    return result
      .pipe(
        switchMap(x => {
          if (x.status === "error") return of(x)
          if (x.status === "success") return of(x)
          return EMPTY
        }),
        take(1),
      )
      .toPromise()
  }
  return Promise.resolve(result)
}
