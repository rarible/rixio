import { PromiseStatus } from "@rixio/rxjs-atom-promise"
import { promiseStatusIdle } from "@rixio/rxjs-atom-promise/build/promise-state"

export type ListPartLoader<T, C> = (continuation: C | null) => Promise<[T[], C | null]>

export type InfiniteListState<T, C> = {
	items: T[]
	continuation: C | null
	finished: boolean
} & PromiseStatus

export function listStateIdle<D, C>(): InfiniteListState<D, C> {
	return {
		...promiseStatusIdle,
		items: [],
		continuation: null,
		finished: false,
	}
}
