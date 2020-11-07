import React, { ReactNode, Ref, useCallback, useMemo } from "react"
import { Atom } from "@rixio/rxjs-atom"
import { InfiniteListState, ListPartLoader } from "@rixio/list"
import InfiniteLoader from "react-window-infinite-loader"
import { FixedSizeList, ListChildComponentProps, ListOnItemsRenderedProps } from "react-window"
import { RxInfiniteList } from "../../list/src/simple"

type OnItemsRendered = (props: ListOnItemsRenderedProps) => any

export type ScrollableInfiniteListProps<T, C> = {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	itemRenderer: (item: T) => React.ReactNode
	pending: React.ReactNode
}

export function ScrollableInfiniteList<T, C>({
	state$,
	loader,
	itemRenderer,
	pending,
}: ScrollableInfiniteListProps<T, C>) {
	const children = useCallback(
		({ items, finished, load }) => {
			return (
				<WindowInfiniteList<T>
					finished={finished}
					loadNextPage={load}
					items={items}
					itemRenderer={itemRenderer}
					pending={pending}
				/>
			)
		},
		[itemRenderer, pending]
	)
	return <RxInfiniteList state$={state$} loader={loader} children={children} />
}

interface WindowInfiniteListProps<T> {
	finished: boolean
	items: T[]
	loadNextPage: () => Promise<void>
	itemRenderer: (item: T) => ReactNode
	pending: ReactNode
}

function WindowInfiniteList<T>({ finished, items, loadNextPage, itemRenderer, pending }: WindowInfiniteListProps<T>) {
	const itemCount = finished ? items.length : items.length + 1
	const isItemLoaded = useCallback((index: number) => finished || index < items.length, [finished, items.length])
	const Item = useMemo(
		() => ({ index, style }: ListChildComponentProps) => {
			const content = isItemLoaded(index) ? itemRenderer(items[index]) : pending
			return <div style={style}>{content}</div>
		},
		[itemRenderer, isItemLoaded, items, pending]
	)
	const render = useCallback(
		({ onItemsRendered, ref }: { onItemsRendered: OnItemsRendered; ref: Ref<any> }) => (
			<FixedSizeList
				itemCount={itemCount}
				onItemsRendered={onItemsRendered}
				ref={ref}
				itemSize={200}
				width={500}
				height={350}
			>
				{Item}
			</FixedSizeList>
		),
		[Item, itemCount]
	)

	return (
		<InfiniteLoader
			isItemLoaded={isItemLoaded}
			itemCount={itemCount}
			loadMoreItems={loadNextPage}
			threshold={1}
			children={render}
		/>
	)
}
