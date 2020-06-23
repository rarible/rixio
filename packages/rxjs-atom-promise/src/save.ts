import { createPromiseStatusRejected, PromiseState, PromiseStatus } from "./promise-state"
import { Atom } from "@rixio/rxjs-atom"

export interface LoadAtoms<T> {
	value?: Atom<T | undefined>
	status?: Atom<PromiseStatus>,
}

export async function save<T>(
	promise: Promise<T>,
	value: LoadAtoms<T> | Atom<PromiseState<T>>,
): Promise<void> {
	if ("get" in value) {
		value.lens("status").set("pending")

		try {
			const result = await promise
			value.modify(v => ({...v, value: result, status: "fulfilled" }))
		} catch (e) {
			value.modify(v => ({ ...v, ...createPromiseStatusRejected(e) }))
		}
	} else {
		value.status?.lens("status")?.set("pending")

		try {
			const result = await promise
			value.value?.set(result)
			value.status?.lens("status")?.set("fulfilled")
		} catch (e) {
			value.status?.modify(x => ({...x, ...createPromiseStatusRejected(e)}))
		}
	}
}
