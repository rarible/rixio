import { Atom } from "@rixio/atom"
import { Observable } from "rxjs"
import { useCallback, useEffect, useMemo } from "react"
import { CacheState, idleCache, save } from "@rixio/cache"
import { InfiniteList } from "./infinite-list"

export type ShouldRefreshProps<T, C> = {
	list$: InfiniteList<T, C, any>
	mapId?: (x: T) => any
	onRefresh?: () => void
}

export type ShouldRefreshReturnType = {
	shouldRefresh$: Observable<boolean>
	refreshing$: Observable<boolean>
	refresh: () => Promise<void>
}

export function useShouldRefresh<T, C>({
	list$,
	mapId = e => e,
	onRefresh,
}: ShouldRefreshProps<T, C>): ShouldRefreshReturnType {
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
			switch (should) {
				case "explicitly":
					refresh()
					break
				case "should":
					shouldRefresh$.set(true)
					break
				case "never":
					shouldRefresh$.set(false)
					break
			}
		})
	}, [list$, mapId, shouldRefresh$, refresh])

	return {
		shouldRefresh$,
		refreshing$,
		refresh,
	}
}

async function shouldRefresh<T, C>(list$: InfiniteList<T, C, any>, mapId: (x: T) => any) {
	const { status, items } = list$.state$.get()
	if (status === "fulfilled") {
		const [nextItems] = await list$.loadPage(null)
		if (!mapId(items[0])) {
			return "explicitly"
		}
		const last = nextItems.length - 1
		if (mapId(nextItems[0]) !== mapId(items[0]) || mapId(nextItems[last]) !== mapId(items[last])) {
			return "should"
		}
	}
	return "never"
}

async function loadFirstPage<T, C>(list$: InfiniteList<T, C, any>) {
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
