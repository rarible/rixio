import { Observable } from "rxjs"
import React, { ReactElement } from "react"
import { PromiseState } from "./promise-state"
import { useRxWithStatus } from "./use-rx-with-status"

export type OrReactChild<T> = React.ReactChild | React.ReactChild[] | T

type HandlePendingType = "every" | "initial" | "none"

export interface RxProps<T> {
	value$: Observable<T | PromiseState<T>>
	idle?: React.ReactNode
	pending?: React.ReactNode
	handlePending?: HandlePendingType
	rejected?: OrReactChild<(error: any) => React.ReactNode>
	children?: OrReactChild<(value: T) => React.ReactNode>
}

export function Rx<T>({
	value$,
	idle,
	pending,
	rejected,
	children,
	handlePending = "every",
}: RxProps<T>): ReactElement {
	const plain: PromiseState<T | PromiseState<T>> = useRxWithStatus(value$)
	let state: PromiseState<T>
	if (
		plain.status === "fulfilled"
		&& typeof plain.value === "object"
		&& plain.value !== null
		&& "status" in plain.value
	) {
		state = plain.value
	} else {
		state = plain as PromiseState<T>
	}
	switch (state.status) {
		case "idle":
			return <>{idle}</>
		case "fulfilled":
			return <>{returnSuccess(state.value, children)}</>
		case "rejected":
			if (typeof rejected === "function") {
				return <>{rejected(state.error)}</>
			}
			return <>{rejected}</>
		case "pending":
			switch (handlePending) {
				case "every":
					return <>{pending}</>
				case "initial":
					if (state.value === undefined) return <>{pending}</>
					else return <>{returnSuccess(state.value, children)}</>
				case "none":
					return <></>
			}
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
