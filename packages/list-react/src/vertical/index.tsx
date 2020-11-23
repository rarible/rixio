import React, { useCallback } from "react"
import { Atom } from "@rixio/rxjs-atom"
import { RenderInfo, RxInfiniteList } from "@rixio/list/src/simple"
import type { Index } from "react-virtualized"
import { InfiniteListState, ListPartLoader } from "@rixio/list"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { List, ListProps } from "react-virtualized/dist/es/List"

export type VerticalListRect = {
	width: number
	height: number
	rowHeight: number
	gap: number
}

export type VerticalListItemRendererProps<T> =
	| {
			type: "item"
			data: T
	  }
	| {
			type: "pending"
	  }

export type VerticalListProps<T, C> = Partial<ListProps> & {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	rect: VerticalListRect
	itemRenderer: (props: VerticalListItemRendererProps<T>) => React.ReactNode
}

export function VerticalList<T, C>({ state$, loader, rect, itemRenderer, ...listProps }: VerticalListProps<T, C>) {
	const children = useCallback(
		({ items, load, finished, status }: RenderInfo<T, C>) => {
			const isRowLoaded = ({ index }: Index) => finished || index < items.length
			const rowCount = status === "pending" ? items.length + 1 : items.length
			const renderableRaw = items.map(x => ({
				type: "item",
				data: x,
			}))
			const renderable =
				status === "pending"
					? (renderableRaw.concat({ type: "pending" } as any) as VerticalListItemRendererProps<T>[])
					: (renderableRaw as VerticalListItemRendererProps<T>[])

			return (
				<InfiniteLoader rowCount={Infinity} isRowLoaded={isRowLoaded} loadMoreRows={load}>
					{({ registerChild, ...rest }) => {
						return (
							<List
								rowCount={rowCount}
								rowHeight={rect.rowHeight}
								height={rect.height}
								width={rect.width}
								ref={registerChild}
								rowRenderer={({ index, key, style }) => (
									<div
										key={key}
										style={{
											...style,
											paddingBottom: index !== items.length - 1 ? rect.gap : 0,
										}}
									>
										{itemRenderer(renderable[index])}
									</div>
								)}
								{...rest}
								{...listProps}
							/>
						)
					}}
				</InfiniteLoader>
			)
		},
		[itemRenderer, listProps, rect]
	)

	return <RxInfiniteList state$={state$} loader={loader} children={children} />
}
