import type { Atom } from "@rixio/rxjs-atom"
import type { AtomStateStatus } from "@rixio/rxjs-cache"
import type { OrReactChild } from "@rixio/rxjs-react"

export type ListPartLoader<T, C> = (continuation: C | null) => Promise<[T[], C | null]>

export type InfiniteListState<T, C> = AtomStateStatus & {
	items: T[]
	continuation: C | null
	finished: boolean
}

export const listStateIdle: InfiniteListState<any, any> = {
	status: "idle",
	items: [],
	continuation: null,
	finished: false,
}

export interface InfiniteListPropsShared<T, C> {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
}
