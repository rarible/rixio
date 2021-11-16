import { concat, Observable, of } from "rxjs"
import { fromPromise } from "rxjs/internal-compatibility"
import { mergeMap, scan, shareReplay } from "rxjs/operators"
import { Validate, ValidationResult, validationResultValidating } from "../domain"

export function createValidationResult<T>(
	value: Observable<T>,
	validate: Validate<T>
): Observable<ValidationResult<T>> {
	const simplified = simplify(validate)
	return value.pipe(
		mergeMap(simplified),
		scan<ValidationResult<T>>((prev, next) => {
			if (next.status === "validating" && prev.status === "error") {
				return prev
			}
			return next
		}, validationResultValidating),
		shareReplay(1)
	)
}

function simplify<T>(validate: Validate<T>): (value: T) => Observable<ValidationResult<T>> {
	return value => {
		const vr = validate(value)
		if (vr instanceof Observable) {
			return vr
		}
		if ("then" in vr) {
			return concat(of(validationResultValidating), fromPromise(vr))
		}
		return of(vr)
	}
}
