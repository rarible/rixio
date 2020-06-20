import { createLoadingStatusError, LoadingState, LoadingStatus } from "./loading-state"
import { Atom } from "@grecha/rxjs-atom"

export interface LoadAtoms<T> {
	value?: Atom<T | undefined>
	status?: Atom<LoadingStatus>,
}

export async function save<T>(
	promise: Promise<T>,
	value: LoadAtoms<T> | Atom<LoadingState<T>>,
): Promise<void> {
	if ("get" in value) {
		value.lens("status").set("loading")

		try {
			const result = await promise
			value.modify(v => ({...v, value: result, status: "success" }))
		} catch (e) {
			value.modify(v => ({ ...v, ...createLoadingStatusError(e) }))
		}
	} else {
		value.status?.lens("status")?.set("loading")

		try {
			const result = await promise
			value.value?.set(result)
			value.status?.lens("status")?.set("success")
		} catch (e) {
			value.status?.modify(x => ({...x, ...createLoadingStatusError(e)}))
		}
	}
}

export const stateToAtoms = <T>(state: Atom<LoadingState<T>>): LoadAtoms<T> => ({
	value: state.lens("value"),
	status: state,
})
