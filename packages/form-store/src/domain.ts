import type { Observable } from "rxjs"

export type ValidationResultValidating = { status: "validating" }
export const validationResultValidating: ValidationResultValidating = { status: "validating" }

export type ValidationResultSuccess = { status: "success" }
export const validationResultSuccess: ValidationResultSuccess = { status: "success" }

export type ValidationResultError<T> = {
	status: "error"
	error: string
	children: {
		[P in keyof T]+?: ValidationResult<T[P]>
	}
}

export type ValidationResult<T> = ValidationResultSuccess | ValidationResultValidating | ValidationResultError<T>
export type ValidationStatus = ValidationResult<any>["status"]
export type Validate<T> = (
	value: T
) => ValidationResult<T> | PromiseLike<ValidationResult<T>> | Observable<ValidationResult<T>>
