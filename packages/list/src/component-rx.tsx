import React, { useCallback, useEffect } from "react"
import { useRxOrThrow } from "@rixio/rxjs-react"
import { loadNext } from "./load-next"
import type { InfiniteListPropsShared, InfiniteListState } from "./domain"

export type RenderInfo<T, C> = InfiniteListState<T, C> & {
	load: () => Promise<void>
}

export type RxInfiniteListProps<T, C> = InfiniteListPropsShared<T, C> & {
	children: (renderInfo: RenderInfo<T, C>) => React.ReactNode
}

export function RxInfiniteList<T, C>({
	state$,
	loader,
	pending,
	children,
	rejected,
}: RxInfiniteListProps<T, C>): React.ReactElement {
	const load = useCallback(() => loadNext(state$, loader), [state$, loader])
	const state = useRxOrThrow(state$)
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
