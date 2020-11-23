import { AtomStateStatus } from "@rixio/rxjs-cache"

export type ListPartLoader<T, C> = (continuation: C | null) => Promise<[T[], C | null]>

export type InfiniteListState<T, C> = {
	items: T[]
	continuation: C | null
	finished: boolean
} & AtomStateStatus

export const listStateIdle: InfiniteListState<any, any> = {
	status: "idle",
	items: [],
	continuation: null,
	finished: false,
}
