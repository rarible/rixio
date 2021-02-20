import { Atom } from "@rixio/atom"
import { identity, Observable } from "rxjs"
import { useCallback, useEffect, useMemo } from "react"
import { CacheState, idleCache, save } from "@rixio/cache"
import type { BaseInfiniteList } from "./infinite-list"

export type ShouldRefreshReturnType = {
	shouldRefresh$: Observable<boolean>
	refreshing$: Observable<boolean>
	refresh: () => Promise<void>
}

export function useShouldRefresh<T, C>(
	list$: BaseInfiniteList<T, C, any>, 
	mapId: (x?: T) => any = identity,
	onRefresh?: () => void, 
): ShouldRefreshReturnType {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const shouldRefresh$ = useMemo(() => Atom.create(false), [list$])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const saveState$ = useMemo(() => Atom.create<CacheState<void>>(idleCache), [shouldRefresh$])
	const refreshing$ = useMemo(() => saveState$.view("status").view(x => x === "pending"), [saveState$])

	const refresh = useCallback(() => {
		const job = async () => {
			onRefresh?.()
			await loadFirstPage(list$)
			shouldRefresh$.set(false)
		}
		return save(job(), saveState$)
	}, [list$, onRefresh, saveState$, shouldRefresh$])

	useEffect(() => {
		shouldRefresh(list$, mapId).then(should => {
			shouldRefresh$.set(should)
		})
	}, [list$, mapId, shouldRefresh$])

	return { shouldRefresh$, refreshing$, refresh }
}

async function shouldRefresh<T, C>(list$: BaseInfiniteList<T, C, any>, mapId: (x?: T) => any) {
	const { status, items } = list$.state$.get()
	if (status === "fulfilled") {
		const [next] = await list$.loadPage(null)
		const last = next.length - 1
		return mapId(next[0]) !== mapId(items[0]) || mapId(next[last]) !== mapId(items[last])
	}
	return false
}

async function loadFirstPage<T, C>(list$: BaseInfiniteList<T, C, any>) {
	const [items, continuation] = await Promise.all([list$.loadPage(null), delay(500)]).then(x => x[0])
	const finished = items.length === 0 || continuation === null
	list$.state$.set({
		finished,
		items,
		continuation,
		status: "fulfilled",
	})
}

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}