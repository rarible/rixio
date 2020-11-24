import React, { useEffect, useCallback } from "react"
import { useRxOrThrow } from "@rixio/rxjs-react"
import type { AtomStateStatus } from "@rixio/rxjs-cache"
import { InfiniteListPropsShared, InfiniteListState, listStateIdle } from "./domain"
import { loadNext } from "./load-next"

export type InfiniteListProps<T, C> = InfiniteListPropsShared<T, C> & {
	children: (load: () => Promise<void>) => React.ReactNode
}

export function InfiniteList<T, C>({ state$, loader, pending, children, rejected }: InfiniteListProps<T, C>) {
	const load = useCallback(() => loadNext(state$, loader), [state$, loader])
	const state = useRxOrThrow(state$)
	const initialStatus = getInitalStatus(state)
	useEffect(() => {
		if (initialStatus.status === "idle") {
			load().then()
		}
	}, [load, initialStatus])

	if (initialStatus.status === "pending") {
		if (pending) {
			return <>{pending}</>
		}
		return <>{children(load)}</>
	} else if (initialStatus.status === "rejected") {
		if (typeof rejected === "function") {
			return (
				<>
					{rejected(initialStatus.error, async () => {
						state$.set(listStateIdle)
					})}
				</>
			)
		}
		if (rejected) {
			return <>{rejected}</>
		}
		return <>{children(load)}</>
	} else if (initialStatus.status === "fulfilled") {
		return <>{children(load)}</>
	}
	return null
}

function getInitalStatus(state: InfiniteListState<any, any>): AtomStateStatus {
	if (state.items.length > 0) {
		return { status: "fulfilled" }
	} else {
		const { items, continuation, finished, ...rest } = state
		return rest
	}
}
