import React, { CSSProperties, memo, useCallback, useMemo, useRef } from "react"
import { isFakeItem } from "@rixio/list"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { Grid, GridCellRenderer, GridProps, RenderedSection } from "react-virtualized/dist/es/Grid"
import { WindowScroller } from "react-virtualized/dist/es/WindowScroller"
import type { Index } from "react-virtualized"
import { IndexRange } from "react-virtualized"
import { Property } from "csstype"
import { ListReactRenderer } from "../domain"
import { liftReactList, RxReactListProps } from "../rx"

export type GridRect = {
	rowHeight: number
	columnCount: number
	gap: number
	width: number
}

export type GridWindowListProps<T> = {
	renderer: ListReactRenderer<T>
	data: T[]
	rect: GridRect
	gridProps?: Partial<GridProps>
	threshold?: number
	pendingSize?: number
	minimumBatchRequest?: number
	loadNext: () => void
}

export function GridWindowList<T, C>({
	data,
	rect,
	minimumBatchRequest = 10,
	renderer,
	gridProps = {},
	threshold = 3,
	loadNext,
}: GridWindowListProps<T>) {
	const onRowsRenderedRef = useRef<((params: RenderedSection) => any) | undefined>()
	const isRowLoaded = useCallback(
		({ index }: Index) => {
			const rowStart = rect.columnCount * index
			return rowStart < data.length && !isFakeItem(data[rowStart])
		},
		[data, rect.columnCount]
	)
	const loadMoreRows = useCallback<(params: IndexRange) => Promise<any>>(async () => loadNext(), [loadNext])

	const cellRenderer: GridCellRenderer = ({ key, style, columnIndex, rowIndex }) => (
		<GridWindowListCell
			gap={rect.gap}
			width={style.width}
			height={style.height}
			top={style.top}
			left={style.left}
			rowIndex={rowIndex}
			columnIndex={columnIndex}
			key={key}
			columnCount={rect.columnCount}
			rowCount={data.length}
			renderer={renderer}
			data={data}
		/>
	)

	return (
		<InfiniteLoader
			threshold={threshold}
			isRowLoaded={isRowLoaded}
			rowCount={Infinity}
			loadMoreRows={loadMoreRows}
			minimumBatchRequest={minimumBatchRequest}
		>
			{({ registerChild, onRowsRendered }) => {
				if (!onRowsRenderedRef.current) {
					onRowsRenderedRef.current = (r: RenderedSection) => {
						onRowsRendered({
							startIndex: r.rowStartIndex,
							stopIndex: r.rowStopIndex,
						})
					}
				}

				return (
					<WindowScroller>
						{({ height, isScrolling, onChildScroll, scrollTop }) => (
							<Grid
								columnCount={rect.columnCount}
								scrollTop={scrollTop}
								onScroll={onChildScroll}
								columnWidth={rect.width / rect.columnCount}
								rowCount={data.length}
								rowHeight={rect.rowHeight}
								isScrolling={isScrolling}
								cellRenderer={cellRenderer}
								{...gridProps}
								autoHeight
								height={height}
								width={rect.width}
								ref={registerChild}
								onSectionRendered={onRowsRenderedRef.current}
							/>
						)}
					</WindowScroller>
				)
			}}
		</InfiniteLoader>
	)
}

type GridWindowListCellProps<T> = {
	rowIndex: number
	columnIndex: number
	width?: Property.Width<number>
	height?: Property.Height<number>
	top?: Property.Top<number>
	left?: Property.Left<number>
	columnCount: number
	renderer: ListReactRenderer<any>
	gap: number
	rowCount: number
	data: T[]
}

const GridWindowListCell = memo(function GridWindowListCell<T>({
	renderer,
	rowIndex,
	columnCount,
	columnIndex,
	width,
	height,
	top,
	left,
	gap,
	data,
	rowCount,
}: GridWindowListCellProps<T>) {
	const index = rowIndex * columnCount + columnIndex
	const finalStyle = useMemo<CSSProperties>(
		() => ({
			position: "absolute",
			width,
			height,
			top,
			left,
			...getStylesWithGap(gap, rowIndex, columnIndex, rowCount, columnCount),
		}),
		[columnCount, columnIndex, gap, rowCount, rowIndex, width, height, top, left]
	)
	const item = data[index]
	const children = useMemo(() => renderer(item), [item, renderer])
	return <div style={finalStyle} children={children} />
})

const getStylesWithGap = (gap: number, row: number, col: number, rowCount: number, columnCount: number) => ({
	paddingLeft: col !== 0 ? gap / 2 : 0,
	paddingRight: col !== columnCount - 1 ? gap / 2 : 0,
	paddingTop: row !== 0 ? gap : 0,
	paddingBottom: row !== rowCount - 1 ? gap / 2 : 0,
})

export const RxGridWindowList: <T>(props: RxReactListProps<T, GridWindowListProps<T>>) => JSX.Element = liftReactList(
	GridWindowList
) as any
