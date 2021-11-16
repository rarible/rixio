import { Atom } from "@rixio/atom"
import type { Observable } from "rxjs"
import { map } from "rxjs/operators"
import { Validate, ValidationResult, validationResultSuccess, validationResultValidating } from "./domain"
import { createValidationResult } from "./utils/create-validation-result"

export class FormStore<T> {
	canSubmit$: Observable<boolean>
	private readonly bindCache: Map<keyof T, FormStore<any>> = new Map()

	constructor(public readonly value: Atom<T>, public readonly validationResult: Observable<ValidationResult<T>>) {
		this.canSubmit$ = this.validationResult.pipe(map(x => x.status === "success"))
	}

	bind<K extends keyof T>(field: K): FormStore<T[K]> {
		const cached = this.bindCache.get(field)
		if (!cached) {
			const created = new FormStore(this.value.lens(field), this.getChild(field))
			this.bindCache.set(field, created).get(field)
			return created
		}
		return cached
	}

	private getChild<K extends keyof T>(field: K): Observable<ValidationResult<T[K]>> {
		return this.validationResult.pipe(
			map(x => {
				if (x.status === "validating") {
					return validationResultValidating
				}
				if (x.status === "error" && x.children?.[field]) {
					return x.children[field] as ValidationResult<T[K]>
				}
				return validationResultSuccess
			})
		)
	}

	static create<K>(value: Atom<K>, validate: Validate<K>) {
		return new FormStore(value, createValidationResult(value, validate))
	}
}
