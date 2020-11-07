import React, { useCallback, useEffect, useMemo } from "react";
import { Atom } from "@rixio/rxjs-atom"
import { OrReactChild } from "@rixio/rxjs-atom-promise"
import { useRx } from "@rixio/rxjs-react"
import { distinctUntilKeyChanged, map } from "rxjs/operators"
import {
	createPromiseStatusRejected,
	promiseStatusFulfilled,
	promiseStatusIdle,
	promiseStatusPending,
} from "@rixio/rxjs-atom-promise/build/promise-state"
import { InfiniteListState, ListPartLoader, listStateIdle } from "./domain"
import { loadNext } from "./load-next"

export interface InfiniteListProps<T, C> {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	pending?: React.ReactNode
	children: (load: () => Promise<void>) => React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
}

export function InfiniteList<T, C>({ state$, loader, pending, children, rejected }: InfiniteListProps<T, C>) {
	const load = useCallback(() => loadNext(state$, loader), [state$, loader])
	const initialStatus$ = useMemo(
		() =>
			state$.pipe(
				map(x => {
					if (x.items.length > 0) {
						return promiseStatusFulfilled
					} else if (x.status === "rejected") {
						return createPromiseStatusRejected(x.error)
					} else if (x.status === "idle") {
						return promiseStatusIdle
					} else if (x.status === "fulfilled") {
						return promiseStatusFulfilled
					} else if (x.status === "pending") {
						return promiseStatusPending
					}
					throw new Error("never happens")
				}),
				distinctUntilKeyChanged("status")
			),
		[state$]
	)
	const initialStatus = useRx(initialStatus$)
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
						state$.set(listStateIdle())
					})}
				</>
			)
		}
		return <>{rejected}</>
	} else if (initialStatus.status === "fulfilled") {
		return <>{children(load)}</>
	}
	return null
}
