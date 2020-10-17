import { PromiseStatus } from "./promise-state"

export type ListPartLoader<T, C> = (continuation: C | null) => Promise<[T[], C | null]>

export type InfiniteListState<T, C> = {
	items: T[]
	continuation: C | null
	finished: boolean
} & PromiseStatus
