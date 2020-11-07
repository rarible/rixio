import React, { useCallback, useEffect } from "react"
import { Atom } from "@rixio/rxjs-atom"
import { OrReactChild } from "@rixio/rxjs-atom-promise"
import { useRx } from "@rixio/rxjs-react"
import { InfiniteListState, ListPartLoader } from "./domain"
import { loadNext } from "./load-next"

export type RenderInfo<T, C> = InfiniteListState<T, C> & {
	load: () => Promise<void>
}

export interface InfiniteListProps<T, C> {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	pending?: React.ReactNode
	children: (info: RenderInfo<T, C>) => React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
}

export function RxInfiniteList<T, C>({
	state$,
	loader,
	pending,
	children,
	rejected,
}: InfiniteListProps<T, C>): React.ReactElement {
	const load = useCallback(() => loadNext(state$, loader), [state$, loader])
	const state = useRx(state$)
	useEffect(() => {
		if (state.status === "idle") {
			load().then()
		}
	}, [load, state.status])

	switch (state.status) {
		case "idle": {
			if (pending) {
				return <>{pending}</>
			} else {
				return <>{children({ ...state, load })}</>
			}
		}
		case "pending":
			if (state.items.length === 0) {
				if (pending) {
					return <>{pending}</>
				} else {
					return <>{children({ ...state, load })}</>
				}
			} else {
				return <>{children({ ...state, load })}</>
			}
		case "fulfilled":
			return <>{children({ ...state, load })}</>
		case "rejected":
			if (rejected) {
				if (typeof rejected === "function") {
					return <>{rejected(state.error, load)}</>
				} else {
					return <>{rejected}</>
				}
			} else {
				return <>{children({ ...state, load })}</>
			}
	}
}
