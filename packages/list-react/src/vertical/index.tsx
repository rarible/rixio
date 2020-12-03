import React, { useCallback } from "react"
import type { Index } from "react-virtualized"
import { RenderInfo, RxInfiniteList } from "@rixio/list"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { List, ListProps } from "react-virtualized/dist/es/List"
import { InfiniteListProps } from "@rixio/list/build/component"
import type { ListReactRenderer, ListReactRendererItem } from "../domain"

export type VerticalListRect = {
	width: number
	height: number
	rowHeight: number
	gap: number
}

export type VerticalListProps<T, C> = Omit<InfiniteListProps<T, C>, "children"> & {
	rect: VerticalListRect
	renderer: ListReactRenderer<T>
	listProps?: Partial<ListProps>
	threshold?: number
	minimumBatchRequest?: number
}

export function VerticalList<T, C>({
	threshold,
	state$,
	rect,
	minimumBatchRequest,
	renderer,
	listProps = {},
	...restProps
}: VerticalListProps<T, C>) {
	const children = useCallback(
		({ load, items, status, finished }: RenderInfo<T, C>) => {
			const isRowLoaded = ({ index }: Index) => finished || index < items.length
			const rowCount = finished ? items.length : items.length + 1
			const raw = items.map(x => ({ type: "item", data: x }))
			const renderable = (status === "pending" ? [...raw, { type: "pending" }] : raw) as ListReactRendererItem<T>[]

			return (
				<InfiniteLoader
					threshold={threshold}
					rowCount={Infinity}
					isRowLoaded={isRowLoaded}
					loadMoreRows={load}
					minimumBatchRequest={minimumBatchRequest}
				>
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
										{renderer(renderable[index])}
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
		[renderer, listProps, rect, threshold, minimumBatchRequest]
	)

	return <RxInfiniteList state$={state$} children={children} {...restProps} />
}
