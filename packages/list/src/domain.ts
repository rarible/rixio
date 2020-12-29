import type { AtomStateStatus } from "@rixio/cache"
import type { OrReactChild } from "@rixio/react"
import React from "react"
import { InfiniteList } from "./infinite-list"

export type ListPartLoader<T, C> = (size: number, continuation: C | null) => Promise<[T[], C | null]>

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

export interface InfiniteListPropsShared<T, C, R> {
	list$: InfiniteList<T, C, R>
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
}
