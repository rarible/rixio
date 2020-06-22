import { Observable } from "rxjs"
import { PromiseState } from "./promise-state"
import React, { ReactElement, ReactNode, useMemo } from "react"
import { map } from "rxjs/operators"
import { useRxWithStatus } from "./use-rx-with-status"

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

export interface LoaderProps<T> {
	state$: Observable<T | PromiseState<T>>
	idle?: React.ReactNode
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any) => React.ReactNode>
	children?: OrReactChild<(value: T) => React.ReactNode>
}

export function Rx<T>({state$, idle, pending, rejected, children}: LoaderProps<T>): ReactElement {
	const rx: Observable<ReactNode> = useMemo(() => {
		return state$.pipe(map(x => {
			if (typeof x === "object" && "status" in x) {
				switch (x.status) {
					case "pending":
						return pending
					case "fulfilled":
						return returnSuccess(x.value, children)
					case "rejected":
						return returnError(x.error, rejected)
					default:
						return idle
				}
			} else {
				return returnSuccess(x, children)
			}
		}))
	}, [children, rejected, idle, pending, state$])
	const result = useRxWithStatus(rx)
	switch (result.status) {
		case "pending":
			return <>{pending}</>
		case "fulfilled":
			return <>{result.value}</>
		case "rejected":
			return <>{returnError(result.error, rejected)}</>
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
