import { Observable } from "rxjs"
import { LoadingState } from "./loading-state"
import React, { ReactElement, ReactNode, useMemo } from "react"
import { map } from "rxjs/operators"
import { useRxWithStatus } from "@grecha/rxjs-react"

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export interface LoaderProps<T> {
	state$: Observable<T | LoadingState<T>>
	idle?: React.ReactNode
	loading?: React.ReactNode
	error?: OrReactChild<(error: any) => React.ReactNode>
	children?: OrReactChild<(value: T) => React.ReactNode>
}

export function Loader<T>({state$, idle, loading, error, children}: LoaderProps<T>): ReactElement {
	const rx: Observable<ReactNode> = useMemo(() => {
		return state$.pipe(map(x => {
			if (typeof x === "object" && "status" in x) {
				switch (x.status) {
					case "loading":
						return loading
					case "success":
						return returnSuccess(x.value, children)
					case "error":
						return returnError(x.error, error)
					default:
						return idle
				}
			} else {
				return returnSuccess(x, children)
			}
		}))
	}, [children, error, idle, loading, state$])
	const result = useRxWithStatus(rx)
	switch (result.status) {
		case "loading":
			return <>{loading}</>
		case "success":
			return <>{result.value}</>
		case "error":
			return <>{returnError(result.error, error)}</>
		default:
			return <>{idle}</>
	}
}

function returnSuccess<T>(value: T, children: undefined | OrReactChild<(value: T) => React.ReactNode>) {
	if (typeof children === "function") {
		return children(value)
	} else if (children) {
		return children
	} else {
		return value
	}
}

function returnError(err: any, error: undefined | OrReactChild<(error: any) => React.ReactNode>): ReactNode {
	if (typeof error === "function") {
		return error(err)
	}
	return error
}
