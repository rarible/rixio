import React, { ReactNode } from "react"
import { PromiseStatus, Rx } from "@rixio/rxjs-atom-promise";
import { Atom } from "@rixio/rxjs-atom"
import { InfiniteList, InfiniteListState, ListPartLoader } from "@rixio/list"
import InfiniteLoader from "react-window-infinite-loader"
import { FixedSizeList, ListChildComponentProps } from "react-window"

export type ScrollableInfiniteListProps<T, C> = {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	children: (item: T) => React.ReactNode
	partLoading: React.ReactNode
	renderEmpty: () => React.ReactNode
	renderRejected: (error: Error) => React.ReactNode
}

export function ScrollableInfiniteList<T, C>({
	state$,
	loader,
	children,
	renderEmpty,
	renderRejected,
	partLoading,
	...restProps
}: ScrollableInfiniteListProps<T, C>) {

	return (
		<InfiniteList state$={state$} loader={loader}>
			{load => (
				<Rx value$={state$}>
					{state => {
						console.log("render", state)
						const { items, finished, status } = state
						if (items.length > 0) {
							return (
								<Bla<T> status={status} hasNextPage={!finished} loadNextPage={load} items={items} children={children} />
							)
						}
						switch (state.status) {
							case "pending": {
								return partLoading
							}
							case "fulfilled": {
								return renderEmpty()
							}
							case "rejected": {
								return renderRejected(state.error)
							}
							default: {
								return null
							}
						}
					}}
				</Rx>
			)}
		</InfiniteList>
	)
}

interface BlaProps<T> {
	hasNextPage: boolean
	items: T[]
	status: PromiseStatus["status"]
	loadNextPage: () => Promise<void>
	children: (item: T) => ReactNode
}

function Bla<T>({ hasNextPage, items, loadNextPage, children, status }: BlaProps<T>) {
	const itemCount = hasNextPage ? items.length + 1 : items.length
	const isItemLoaded = (index: number) => !hasNextPage || index < items.length

	const Item = ({ index, style }: ListChildComponentProps) => {
		let content
		if (!isItemLoaded(index)) {
			content = "Loading..."
		} else {
			content = children(items[index])
		}
		return <div style={style}>{content}</div>
	}

	return (
		<InfiniteLoader isItemLoaded={isItemLoaded} itemCount={itemCount} loadMoreItems={loadNextPage} threshold={1}>
			{({ onItemsRendered, ref }) => (
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
			)}
		</InfiniteLoader>
	)
}
