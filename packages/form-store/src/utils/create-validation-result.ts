import { concat, Observable, of } from "rxjs"
import { fromPromise } from "rxjs/internal-compatibility"
import { mergeMap, scan, shareReplay } from "rxjs/operators"
import { Validate, ValidationResult, ValidationResultValidating } from "../domain"

export function createValidationResult<T>(
	value: Observable<T>,
	validate: Validate<T>
): Observable<ValidationResult<T>> {
	return value.pipe(
		mergeMap(simplify(validate)),
		scan<ValidationResult<T>>(
			(prev, next) => {
				if (next.status === "validating" && prev.status === "error") {
					return prev
				}
				return next
			},
			{
				status: "validating",
			} as ValidationResultValidating
		),
		shareReplay(1)
	)
}

function simplify<T>(validate: Validate<T>): (value: T) => Observable<ValidationResult<T>> {
	return value => {
		const vr = validate(value)
		if (vr instanceof Observable) {
			return vr
		} else if ("then" in vr) {
			return concat(of({ status: "validating" } as ValidationResultValidating), fromPromise(vr))
		} else {
			return of(vr)
		}
	}
}
