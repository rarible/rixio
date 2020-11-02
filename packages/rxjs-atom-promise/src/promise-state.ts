import { Observable } from "rxjs"
import { filter, first } from "rxjs/operators"

export type PromiseStatusIdle = {
	status: "idle"
}
export type PromiseStatusFulfilled = {
	status: "fulfilled"
}
export type PromiseStatusPending = {
	status: "pending"
}
export type PromiseStatusRejected = {
	status: "rejected"
	error: any
}
export type PromiseStatus = PromiseStatusIdle | PromiseStatusPending | PromiseStatusFulfilled | PromiseStatusRejected

export const promiseStatusIdle: PromiseStatusIdle = {
	status: "idle",
}
export const promiseStatusPending: PromiseStatusPending = {
	status: "pending",
}
export const promiseStatusFulfilled: PromiseStatusFulfilled = {
	status: "fulfilled",
}
export const createPromiseStatusRejected = <T>(error: T): PromiseStatusRejected => ({
	status: "rejected",
	error,
})

export type PromiseState<T> = { value: T } & PromiseStatus

export const createPromiseStateIdle = <T>(emptyValue?: T): PromiseState<T> => ({
	value: emptyValue as T,
	...promiseStatusIdle,
})
export const createPromiseStateFulfilled = <T>(value: T): PromiseState<T> => ({
	value,
	...promiseStatusFulfilled,
})
export const createPromiseStateRejected = <T>(error: any, emptyValue?: T): PromiseState<T> => ({
	value: emptyValue as T,
	...createPromiseStatusRejected(error),
})
export const createPromiseStatePending = <T>(emptyValue?: T): PromiseState<T> => ({
	value: emptyValue as T,
	...promiseStatusPending,
})

export function mapPromiseState<F, T>(mapper: (value: F) => T): (state: PromiseState<F>) => PromiseState<T> {
	return state => {
		if (state.status === "fulfilled") {
			return {
				status: state.status,
				value: mapper(state.value),
			} as PromiseState<T>
		}
		return {
			status: state.status,
			value: state.value as any,
		} as PromiseState<T>
	}
}

export function mapPromiseStateAsync<F, T>(
	mapper: (value: F) => Promise<T>
): (state: PromiseState<F>) => Promise<PromiseState<T>> {
	return async state => {
		if (state.status === "fulfilled") {
			return {
				status: state.status,
				value: await mapper(state.value),
			} as PromiseState<T>
		}
		return {
			status: state.status,
			value: state.value as any,
		} as PromiseState<T>
	}
}

export async function getFinalValue<T>(state$: Observable<PromiseState<T>>) {
	const result = await state$
		.pipe(
			filter(x => x.status === "rejected" || x.status === "fulfilled"),
			first()
		)
		.toPromise()
	switch (result.status) {
		case "rejected":
			return Promise.reject(result.error)
		case "fulfilled":
			return Promise.resolve(result.value)
		default:
			throw new Error("Never happens")
	}
}
