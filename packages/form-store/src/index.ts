import { Observable } from "rxjs"
import { Atom } from "@rixio/rxjs-atom"
import { map } from "rxjs/operators"
import type { Validate, ValidationResult, ValidationResultSuccess, ValidationResultValidating } from "./domain"
import { createValidationResult } from "./utils/create-validation-result"

export const noErrors: ValidationResultSuccess = { status: "success" }
export const validating: ValidationResultValidating = { status: "validating" }

export class FormStore<T> {
	canSubmit$: Observable<boolean>

	constructor(public readonly value: Atom<T>, public readonly validationResult: Observable<ValidationResult<T>>) {
		this.canSubmit$ = this.validationResult.pipe(map(it => it.status === "success"))
	}

	bind<K extends keyof T>(field: K): FormStore<T[K]> {
		return new FormStore(this.value.lens(field), this.getChild(field))
	}

	getChild<K extends keyof T>(field: K) {
		return this.validationResult.pipe(
			map(x => {
				if (x.status === "validating") {
					return { status: "validating" } as ValidationResultValidating
				}
				if (x.status === "error" && x.children?.[field]) {
					return x.children[field] as ValidationResult<T[K]>
				}
				return { status: "success" } as ValidationResultSuccess
			})
		)
	}

	static create<K>(value: Atom<K>, validate: Validate<K>) {
		return new FormStore(value, createValidationResult(value, validate))
	}
}
