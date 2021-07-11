import { RxPropsBase, useRx } from "@rixio/react"
import React, { ComponentType, useCallback, useState } from "react"
import { WrappedObservable } from "@rixio/wrapped"
import {
	Animated,
	FlatList,
	FlatListProps,
	ListRenderItemInfo,
	NativeScrollEvent,
	NativeSyntheticEvent,
} from "react-native"

type BaseListProps<T> = Pick<FlatListProps<T>, "data" | "renderItem" | "onScroll" | "refreshing" | "onRefresh">

type InferItemType<Props extends BaseListProps<any>> = Props extends BaseListProps<infer T> ? T : never

type LiftedFlatListProps<T, Props extends BaseListProps<T>> = Omit<
	Props,
	"data" | "renderItem" | "refreshing" | "onRefresh"
> &
	RxPropsBase & {
		data$: WrappedObservable<T[]>
		renderItem: RxListRenderItem<T>
	}

export function liftFlatList<Props extends BaseListProps<any>>(Component: ComponentType<Props>) {
	function LiftedFlatList({
		data$,
		pending,
		rejected,
		onScroll,
		renderItem: render,
		...rest
	}: LiftedFlatListProps<InferItemType<Props>, Props>) {
		const [nonce, setNonce] = useState(0)
		const finalOnScroll = useInfiniteListScrollEvent(data$, 100, onScroll)
		const data = useRx(data$, [data$, nonce])
		const listLength = data.status === "fulfilled" ? data.value.length : 0
		const renderItem = useCallback<RxListRenderItem<InferItemType<Props>>>(
			x =>
				render({
					...x,
					first: x.index === 0,
					last: x.index + 1 === listLength,
				}),
			[listLength, render]
		)
		const onRefresh = useCallback<() => void>(() => {
			if ("clear" in data$ && typeof data$["clear"] === "function") {
				;(data$ as any)["clear"]()
			}
		}, [data$])

		const common = {
			...rest,
			renderItem,
			onScroll: finalOnScroll,
		}
		if ("clear" in data$) {
			;(common as any)["refreshing"] = data.status === "pending"
			;(common as any)["onRefresh"] = onRefresh
		}
		switch (data.status) {
			case "fulfilled":
				// @ts-ignore
				return <Component data={data.value} {...common} />
			case "pending":
				if (pending) {
					return <>{pending}</>
				} else {
					// @ts-ignore
					return <Component data={[]} {...common} />
				}
			case "rejected":
				if (typeof rejected === "function") {
					const reload = () => {
						data.reload()
						setNonce(n => n + 1)
					}
					return <>{rejected(data.error, reload)}</>
				} else if (rejected) {
					return <>{rejected}</>
				} else {
					// @ts-ignore
					return <Component data={[]} {...common} />
				}
		}
		return null
	}
	LiftedFlatList.displayName = `lifted(${Component.displayName})`
	return LiftedFlatList
}

function useInfiniteListScrollEvent(
	data$: WrappedObservable<Array<any>>,
	offset: number,
	onScroll?: OnScroll
): OnScroll {
	return useCallback<OnScroll>(
		ev => {
			onScroll?.(ev)
			if (isScrollCloseToBottom(offset, ev) && "loadNext" in data$ && typeof data$["loadNext"] === "function") {
				;(data$ as any)["loadNext"]()
			}
		},
		[data$, offset, onScroll]
	)
}

function isScrollCloseToBottom(offset: number, ev: NativeSyntheticEvent<NativeScrollEvent>) {
	return (
		ev.nativeEvent.layoutMeasurement.height + ev.nativeEvent.contentOffset.y >=
		ev.nativeEvent.contentSize.height - offset
	)
}

export interface RxListRenderItemInfo<T> extends ListRenderItemInfo<T> {
	first: boolean
	last: boolean
}

export type RxListRenderItem<T> = (info: RxListRenderItemInfo<T>) => React.ReactElement | null

type OnScroll = (ev: NativeSyntheticEvent<NativeScrollEvent>) => void

export const RxFlatList: <T>(props: RxFlatListProps<T>) => JSX.Element | null = liftFlatList(FlatList) as any
export type RxFlatListProps<T> = LiftedFlatListProps<T, FlatListProps<T>>
export const RxAnimatedFlatList: <T>(props: RxAnimatedFlatListProps<T>) => JSX.Element | null = liftFlatList(
	Animated.FlatList as any
) as any
// @ts-ignore
export type RxAnimatedFlatListProps<T> = LiftedFlatListProps<
	T,
	Animated.AnimatedProps<React.ComponentPropsWithRef<FlatList>>
>
