import { Atom } from "@rixio/atom"
import { Observable } from "rxjs"
import { useEffect, useMemo, useCallback } from "react"
import { CacheState, idleCache, save } from "@rixio/cache"
import { InfiniteListState, ListPartLoader } from "./domain"

export type ShouldRefreshProps<T, C> = {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	mapId?: (x: T) => any
	onRefresh?: () => void
}

export type ShouldRefreshReturnType = {
	shouldRefresh$: Observable<boolean>
	refreshing$: Observable<boolean>
	refresh: () => Promise<void>
}

export function useShouldRefresh<T, C>({
	state$, loader, mapId = (e) => e, onRefresh
}: ShouldRefreshProps<T, C>): ShouldRefreshReturnType {
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const shouldRefresh$ = useMemo(() => Atom.create(false), [state$, loader])
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const saveState$ = useMemo(() => Atom.create<CacheState<void>>(idleCache), [shouldRefresh$])
	const refreshing$ = useMemo(() => saveState$.view("status").view(x => x === "pending"), [saveState$])
	const refresh = useCallback(() => {
		const job = async () => {
			onRefresh?.()
			await loadFirstPage(state$, loader)
			shouldRefresh$.set(false)
		}
		return save(job(), saveState$)
	}, [loader, onRefresh, saveState$, shouldRefresh$, state$])

	useEffect(() => {
		shouldRefresh(state$, loader, mapId)
			.then(should => {
				switch (should) {
					case "explicitly":
						refresh()
						break;
					case "should":
						shouldRefresh$.set(true)
						break;
					case "never":
						shouldRefresh$.set(false)
						break;
				}
			})
	}, [loader, mapId, state$, shouldRefresh$, refresh])

	return {
		shouldRefresh$,
		refreshing$,
		refresh,
	}
}

async function shouldRefresh<T, C>(
	state$: Atom<InfiniteListState<T, C>>, loader: ListPartLoader<T, C>, mapId: (x: T) => any,
) {
	const { status, items } = state$.get()
	if (status === "fulfilled") {
		const [nextItems] = await loader(null)
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

async function loadFirstPage<T, C>(state$: Atom<InfiniteListState<T, C>>, partLoader: ListPartLoader<T, C>) {
	const [items, continuation] = await Promise.all([partLoader(null), delay(500)]).then(x => x[0])
	const finished = items.length === 0 || continuation === null
	state$.set({
		finished,
		items,
		continuation,
		status: "fulfilled",
	})
}

function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
