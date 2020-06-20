import { Observable } from "rxjs"
import { LoadingState } from "./loading-state"
import React, { useMemo } from "react"
import { map } from "rxjs/operators"
import { useRx } from "@grecha/rxjs-react"

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export interface LoaderProps<T> {
	state$: Observable<LoadingState<T>>
	idle?: React.ReactNode
	loading?: React.ReactNode
	error?: OrReactChild<(error: any) => React.ReactNode>
	children?: OrReactChild<(value: T) => React.ReactNode>
}

export function Loader<T>({state$, idle, loading, error, children}: LoaderProps<T>) {
	const rx = useMemo(() => {
		return state$.pipe(map(x => {
			switch (x.status) {
				case "loading":
					return loading
				case "success":
					if (typeof children === "function") {
						return children(x.value)
					} else if (children) {
						return children
					} else {
						return x.value
					}
				case "error":
					if (typeof error === "function")
						return error(x.error)
					return <>{error}</>
				default:
					return idle
			}
		}))
	}, [children, error, idle, loading, state$])
	return <>{useRx(rx)}</>
}
