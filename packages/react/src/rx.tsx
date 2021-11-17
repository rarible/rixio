import React, { ReactNode, useMemo, useState } from "react"
import { WrappedObservable, combineLatest } from "@rixio/wrapped"
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
	value$: WrappedObservable<T>
	children?: OrReactChild<(value: T, reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx2Props<T1, T2> = {
	value$: [WrappedObservable<T1>, WrappedObservable<T2>]
	children?: OrReactChild<(value: [T1, T2], reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx3Props<T1, T2, T3> = {
	value$: [WrappedObservable<T1>, WrappedObservable<T2>, WrappedObservable<T3>]
	children?: OrReactChild<(value: [T1, T2, T3], reload: () => {}) => ReactNode>
} & RxPropsBase

type Rx4Props<T1, T2, T3, T4> = {
	value$: [WrappedObservable<T1>, WrappedObservable<T2>, WrappedObservable<T3>, WrappedObservable<T4>]
	children?: OrReactChild<(value: [T1, T2, T3, T4], reload: () => {}) => ReactNode>
} & RxPropsBase

export function Rx<T>(props: Rx1Props<T>): React.ReactElement
export function Rx<T1, T2>(props: Rx2Props<T1, T2>): React.ReactElement
export function Rx<T1, T2, T3>(props: Rx3Props<T1, T2, T3>): React.ReactElement
export function Rx<T1, T2, T3, T4>(props: Rx4Props<T1, T2, T3, T4>): React.ReactElement
export function Rx({ pending, rejected, children, value$ }: RxProps): React.ReactElement | null {
	const observables = useObservables(value$)
	const [nonce, setNonce] = useState(0)
	const value = useRx(observables, [observables, nonce])
	switch (value.status) {
		case "pending":
			return <>{pending}</>
		case "rejected":
			if (typeof rejected === "function") {
				const reload = () => {
					console.log("reloadingggg")
					value.reload()
					setNonce(n => n + 1)
				}
				return <>{rejected(value.error, reload)}</>
			}
			return <>{rejected}</>
		case "fulfilled":
			const finalResult = Array.isArray(value$) ? value.value : value.value[0]
			if (typeof children === "function") {
				return <>{children(finalResult)}</>
			} else if (children) {
				return <>{children}</>
			} else {
				return <>{finalResult}</>
			}
	}
}

function useObservables(observables: any) {
	const array = getObservables(observables)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	return useMemo(() => combineLatest(array), array)
}

function getObservables(observables: any): WrappedObservable<any>[] {
	if (Array.isArray(observables)) {
		return observables
	} else {
		return [observables]
	}
}
