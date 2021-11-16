import { combineLatest, Observable } from "rxjs"
import { map } from "rxjs/operators"
import type { FormStore } from "./index"

export function isSubmitDisabled(form: FormStore<any>, displayErrors: Observable<boolean>) {
	return combineLatest([form.canSubmit$, displayErrors]).pipe(
		map(([canSubmit, displayErrors]) => displayErrors && !canSubmit)
	)
}
