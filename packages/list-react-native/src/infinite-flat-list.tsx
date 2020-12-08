import React, { useMemo } from "react"
import { RxFlatList, RxFlatListProps, RxListRenderItem } from "@rixio/rxjs-react-native"
import { InfiniteList, InfiniteListState, ListPartLoader } from "@rixio/list"
import { Atom } from "@rixio/rxjs-atom"
import { OrReactChild, RxWrapper } from "@rixio/rxjs-react"
import { AtomStateStatus } from "@rixio/rxjs-cache"
import { distinctUntilChanged, map } from "rxjs/operators"
import { Observable } from "rxjs"
import { useInfiniteListScrollEvent } from "./use-infinite-list-scroll-event"

export type FooterStatus = { status: "fulfilled" } | { status: "pending" } | {}

export type FooterComponentProps = {
	reload: () => Promise<void>
	status: AtomStateStatus
}

export interface InfiniteFlatListProps<T, C>
	extends Omit<InternalInfiniteFlatListProps<T, C>, "load" | "data" | "ListFooterComponent"> {
	loader: ListPartLoader<T, C>
	pending?: React.ReactNode
	rejected?: OrReactChild<(error: any, reload: () => Promise<void>) => React.ReactNode>
	renderItem: RxListRenderItem<T>
	FooterComponent: React.ComponentType<FooterComponentProps>
}

export function InfiniteFlatList<T, C>({
	state$,
	rejected,
	loader,
	pending,
	renderItem,
	FooterComponent,
	...rest
}: InfiniteFlatListProps<T, C>) {
	const simpleStatus$: Observable<AtomStateStatus> = useMemo(() => state$.pipe(
		map(({items, continuation, finished, ...rest}) => rest),
		distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
	), [state$])
	return (
		<InfiniteList state$={state$} loader={loader} pending={pending} rejected={rejected}>
			{load => (
				<InternalInfiniteFlatList<T, C>
					state$={state$}
					renderItem={renderItem}
					load={load}
					ListFooterComponent={<RxWrapper<FooterComponentProps> component={FooterComponent} reload={load} status={simpleStatus$}/>}
					{...rest}
				/>
			)}
		</InfiniteList>
	)
}

type InternalInfiniteFlatListProps<T, C> = Omit<RxFlatListProps<T>, "data"> & {
	load: () => Promise<void>
	state$: Atom<InfiniteListState<T, C>>
}

function InternalInfiniteFlatList<T, C>({ state$, load, renderItem, ...rest }: InternalInfiniteFlatListProps<T, C>) {
	const scrollHandler = useInfiniteListScrollEvent(state$, load, 100)
	return <RxFlatList<T> data={state$.view("items")} renderItem={renderItem} onScroll={scrollHandler} {...rest} />
}
