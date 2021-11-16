import type { CacheState } from "@rixio/cache"
import type { OrReactChild } from "@rixio/react"
import type { ReactNode } from "react"
import type { BaseInfiniteList } from "./infinite-list"

export type ListPartLoader<T, C> = (size: number, continuation: C | null) => Promise<[T[], C | null]>

export type InfiniteListState<T, C> = {
	status: CacheState<T>["status"]
	error?: any
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

export interface InfiniteListPropsShared<T, C, R> {
	list$: BaseInfiniteList<T, C, R>
	pending?: ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => ReactNode>
}
