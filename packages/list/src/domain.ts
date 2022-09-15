import React from "react"
import type { OrReactChild } from "@rixio/react"
import { BaseInfiniteList } from "./infinite-list"

export type ListPartLoader<T, C> = (size: number, continuation: C | null) => Promise<[T[], C | null]>

type InfiniteListStateBase =
	| {
			status: "pending" | "fulfilled" | "idle"
	  }
	| {
			status: "rejected"
			error: unknown
	  }

export type InfiniteListState<T, C> = InfiniteListStateBase & {
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
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
}
