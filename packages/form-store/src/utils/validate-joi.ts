import type { ObjectSchema, ValidationOptions } from "@hapi/joi"
import type { ValidationResult, ValidationResultError, ValidationResultSuccess } from "../domain"

export function validateJoi<T>(
	schema: ObjectSchema,
	options: ValidationOptions = {}
): (value: T) => ValidationResult<T> {
	return value => {
		const vr = schema.validate(value, {
			abortEarly: false,
			stripUnknown: true,
			...options,
		})
		if (vr.error != null) {
			const result: ValidationResultError<any> = {
				status: "error",
				error: vr.error.message,
				children: {},
			}
			vr.error.details.forEach(err => {
				let current: ValidationResultError<any> = result
				err.path.forEach(path => {
					const next: ValidationResultError<any> = { status: "error", error: err.message, children: {} }
					current.children[path] = next
					current = next
				})
			})
			return result as ValidationResult<T>
		}
		return { status: "success" } as ValidationResultSuccess
	}
}
