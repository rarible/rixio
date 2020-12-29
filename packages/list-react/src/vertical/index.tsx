import React, { useCallback } from "react"
import type { Index } from "react-virtualized"
import { IndexRange } from "react-virtualized"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { List, ListProps } from "react-virtualized/dist/es/List"
import { isFakeItem } from "@rixio/list"
import { ListReactRenderer } from "../domain"
import { liftReactList, RxReactListProps } from "../rx";

export type VerticalListRect = {
	width: number
	height: number
	rowHeight: number
	gap: number
}

export type VerticalListProps<T> = {
	renderer: ListReactRenderer<T>
	data: T[]
	rect: VerticalListRect
	listProps?: Partial<ListProps>
	threshold?: number
	minimumBatchRequest?: number
	loadNext: () => void
}

export function VerticalList<T>({
	threshold,
	data,
	rect,
	minimumBatchRequest,
	renderer,
	listProps = {},
	loadNext
}: VerticalListProps<T>) {
	const isRowLoaded = useCallback(({ index }: Index) => index < data.length && !isFakeItem(data[index]), [data])
	const loadMoreRows = useCallback<(params: IndexRange) => Promise<any>>(async () => loadNext(), [loadNext])

	return (
		<InfiniteLoader
			threshold={threshold}
			rowCount={Infinity}
			isRowLoaded={isRowLoaded}
			loadMoreRows={loadMoreRows}
			minimumBatchRequest={minimumBatchRequest}
		>
			{({ registerChild, ...rest }) => {
				return (
					<List
						rowCount={data.length}
						rowHeight={rect.rowHeight}
						height={rect.height}
						width={rect.width}
						ref={registerChild}
						rowRenderer={({ index, key, style }) => (
							<div
								key={key}
								style={{
									...style,
									paddingBottom: index !== data.length - 1 ? rect.gap : 0,
								}}
							>
								{renderer(data[index])}
							</div>
						)}
						{...rest}
						{...listProps}
					/>
				)
			}}
		</InfiniteLoader>
	)
}

export const RxVerticalList: <T>(props: RxReactListProps<T, VerticalListProps<T>>) => (JSX.Element | null) = liftReactList(VerticalList) as any
