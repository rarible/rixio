import React, { ReactNode, useCallback, useMemo } from "react"
import { Cache } from "./cache"
import { Loader, LoaderProps, OrReactChild } from "./loader"
import { mergeLoadingStates } from "./merge"
import { save } from "./save"
import { useRxChange } from "@grecha/rxjs-react"
import { map } from "rxjs/operators"
import { LoadingStatusStatus } from "./loading-state"

type CacheablePropsBase = Omit<LoaderProps<any>, "state$" | "error" | "children"> & {
	error?: OrReactChild<(error: any, load: () => void) => ReactNode>
}

type Cacheable1Props<T> = {
	cache: Cache<T>
	children?: OrReactChild<(value: T) => ReactNode>
} & CacheablePropsBase

type Cacheable2Props<T1, T2> = {
	cache: [Cache<T1>, Cache<T2>]
	children?: OrReactChild<(value: [T1, T2]) => ReactNode>
} & CacheablePropsBase

type CacheableProps = {
	cache: any
	children?: any
} & CacheablePropsBase

function getCaches(cache: any): Cache<any>[] {
	if (Array.isArray(cache)) {
		return cache
	} else {
		return [cache]
	}
}

export function Cacheable<T>(props: Cacheable1Props<T>): React.ReactElement | null
export function Cacheable<T1, T2>(props: Cacheable2Props<T1, T2>): React.ReactElement | null
export function Cacheable({ cache, children, error, ...rest }: CacheableProps): React.ReactElement | null {
	const array = getCaches(cache)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const caches: Cache<any>[] = useMemo(() => array, array)
	const single = useMemo(() => mergeLoadingStates(caches.map(x => x.atom)), [caches])
	useRxChange(single.pipe(map(x => x.status)), s => {
		if (s !== "success") {
			load(caches, "idle")
		}
	}, [caches])
	const reload = useCallback(() => load(caches, "idle", "error"), [caches])
	const newError = useCallback((err: any) => {
		if (typeof error === "function") {
			return error(err, reload)
		} else {
			return error
		}
	}, [error, reload])
	const newChildren = useCallback(value => {
		let realValue: any
		if (Array.isArray(cache)) {
			realValue = value
		} else {
			realValue = value[0]
		}
		if (typeof children === "function") {
			return children(realValue)
		} else if (children) {
			return children
		} else {
			return realValue
		}
	}, [cache, children])

	return <Loader state$={single} {...rest} error={newError} children={newChildren}/>
}

function load(caches: Cache<any>[], ...statuses: LoadingStatusStatus[]) {
	caches.forEach(c => {
		let status = c.atom.get().status
		if (statuses.indexOf(status) !== -1) {
			save(c.load(), c.atom).then()
		}
	})
}
