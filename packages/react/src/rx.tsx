import React, { ReactNode, useMemo, useState } from "react"
import { combineLatest, OWLike } from "@rixio/wrapped"
import { useRx } from "./use-rx"
import { OrReactChild } from "./base"

export interface RxPropsBase {
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => void) => React.ReactNode>
}

export interface RxProps extends RxPropsBase {
	value$: any
	children?: any
}

type Rx1Props<T> = {
	value$: OWLike<T>
	children?: OrReactChild<(value: T, reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx2Props<T1, T2> = {
	value$: [OWLike<T1>, OWLike<T2>]
	children?: OrReactChild<(value: [T1, T2], reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx3Props<T1, T2, T3> = {
	value$: [OWLike<T1>, OWLike<T2>, OWLike<T3>]
	children?: OrReactChild<(value: [T1, T2, T3], reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx4Props<T1, T2, T3, T4> = {
	value$: [OWLike<T1>, OWLike<T2>, OWLike<T3>, OWLike<T4>]
	children?: OrReactChild<(value: [T1, T2, T3, T4], reload: () => {}) => ReactNode>
} & RxPropsBase

export function Rx<T>(props: Rx1Props<T>): React.ReactElement
export function Rx<T1, T2>(props: Rx2Props<T1, T2>): React.ReactElement
export function Rx<T1, T2, T3>(props: Rx3Props<T1, T2, T3>): React.ReactElement
export function Rx<T1, T2, T3, T4>(props: Rx4Props<T1, T2, T3, T4>): React.ReactElement
export function Rx({ pending, rejected, children, value$ }: RxProps): React.ReactElement | null {
	const array = getObservables(value$)
	const observables = useMemo(() => {
		return combineLatest(array)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, array)
	const [nonce, setNonce] = useState(0)
	const value = useRx(observables, [observables, nonce])

	switch (value.status) {
		case "pending":
			return <React.Fragment children={pending} />
		case "rejected":
			if (typeof rejected === "function") {
				return (
					<React.Fragment
						children={rejected(value.error, () => {
							value.reload()
							setNonce(n => n + 1)
						})}
					/>
				)
			}
			return <React.Fragment children={rejected} />
		case "fulfilled":
			const final = Array.isArray(value$) ? value.value : value.value[0]
			if (children) {
				if (typeof children === "function") {
					return <React.Fragment children={children(final)} />
				}
				return <React.Fragment children={children} />
			}
			return <React.Fragment children={final} />
	}
}

function getObservables(observables: OWLike<any> | OWLike<any>[]): OWLike<any>[] {
	return Array.isArray(observables) ? observables : [observables]
}
