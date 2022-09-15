import React, { CSSProperties, memo, useCallback, useMemo, useRef } from "react"
import { isFakeItem } from "@rixio/list"
import { InfiniteLoader, InfiniteLoaderProps } from "react-virtualized/dist/es/InfiniteLoader"
import {
	Grid,
	GridCellRenderer,
	GridProps,
	OverscanIndicesGetter,
	RenderedSection,
} from "react-virtualized/dist/es/Grid"
import { WindowScroller, WindowScrollerChildProps } from "react-virtualized/dist/es/WindowScroller"
import type { Index, IndexRange } from "react-virtualized"
import type { GridReactRenderer } from "../domain"
import { liftReactList, RxReactListProps } from "../rx"
import { identity } from "../utils"

export type GridRect = {
	rowHeight: number
	columnCount: number
	gap: number
	height: number
	width: number
}

export type GridListProps<T> = Partial<Pick<InfiniteLoaderProps, "threshold">> & {
	renderer: GridReactRenderer<T>
	data: T[]
	minimumBatchRequest?: number
	rect: GridRect
	gridProps?: Partial<GridProps>
	pendingSize?: number
	loadNext: () => void
	mapKey?: (key: string) => string
}

export function GridList<T>({
	mapKey = identity,
	data,
	rect,
	minimumBatchRequest = 10,
	renderer,
	gridProps = {},
	threshold = 3,
	loadNext,
}: GridListProps<T>) {
	const onSectionRendered = useRef<(r: RenderedSection) => void>()
	const rowCount = useMemo(() => Math.ceil(data.length / rect.columnCount), [data.length, rect.columnCount])

	const isRowLoaded = useCallback(
		({ index }: Index) => {
			const rowStart = rect.columnCount * index
			return rowStart < data.length && !isFakeItem(data[rowStart])
		},
		[data, rect.columnCount]
	)

	const loadMoreRows = useCallback<(params: IndexRange) => Promise<any>>(async () => loadNext(), [loadNext])
	const cellRenderer = useCallback<GridCellRenderer>(
		({ key, ...restCellProps }) => (
			<GridListCell
				gap={rect.gap}
				columnCount={rect.columnCount}
				renderer={renderer}
				data={data}
				key={mapKey(key)}
				{...restCellProps}
			/>
		),
		[data, mapKey, rect.columnCount, rect.gap, renderer]
	)

	const { onScroll, ...restGridProps } = gridProps

	return (
		<React.Fragment>
			<InfiniteLoader
				threshold={threshold}
				isRowLoaded={isRowLoaded}
				loadMoreRows={loadMoreRows}
				minimumBatchSize={minimumBatchRequest}
				rowCount={Infinity}
			>
				{({ registerChild, onRowsRendered }) => {
					if (!onSectionRendered.current) {
						onSectionRendered.current = (r: RenderedSection) =>
							onRowsRendered({
								startIndex: r.rowStartIndex,
								stopIndex: r.rowStopIndex,
							})
					}
					return (
						<Grid
							columnCount={rect.columnCount}
							columnWidth={rect.width / rect.columnCount}
							rowCount={rowCount}
							rowHeight={rect.rowHeight}
							cellRenderer={cellRenderer}
							height={rect.height}
							width={rect.width}
							onScroll={rowCount > 0 ? onScroll : undefined}
							{...restGridProps}
							overscanIndicesGetter={overscanIndicesGetter}
							ref={registerChild}
							onSectionRendered={onSectionRendered.current}
						/>
					)
				}}
			</InfiniteLoader>
		</React.Fragment>
	)
}

const overscanIndicesGetter: OverscanIndicesGetter = ({
	cellCount, // Number of rows or columns in the current axis
	overscanCellsCount, // Maximum number of cells to over-render in either direction
	startIndex, // Begin of range of visible cells
	stopIndex, // End of range of visible cells
}) => ({
	overscanStartIndex: Math.max(0, startIndex - overscanCellsCount),
	overscanStopIndex: Math.min(cellCount - 1, stopIndex + overscanCellsCount),
})

export type RxGridListProps<T> = RxReactListProps<T, GridListProps<T>>
export const RxGridList: <T>(props: RxGridListProps<T>) => JSX.Element = liftReactList(GridList) as any

export type GridWindowRect = Omit<GridRect, "height">
export type GridListWindowProps<T> = Omit<GridListProps<T>, "rect"> & {
	rect: GridWindowRect
}

export function GridListWindow<T>(props: GridListWindowProps<T>) {
	return <WindowScroller>{childProps => <GridListWindowChild {...childProps} {...props} />}</WindowScroller>
}
export type RxGridListWindowProps<T> = RxReactListProps<T, GridListWindowProps<T>>
export const RxGridListWindow: <T>(props: RxGridListWindowProps<T>) => JSX.Element = liftReactList(
	GridListWindow
) as any

type GridListWindowChildProps<T> = GridListWindowProps<T> &
	WindowScrollerChildProps & {
		height: number
	}
function GridListWindowChild<T>(props: GridListWindowChildProps<T>) {
	const { height, rect, isScrolling, scrollTop, onChildScroll, gridProps = {}, ...restProps } = props
	const finalRect = useMemo(() => ({ ...rect, height }), [height, rect])

	const finalGridProps = useMemo(
		() => ({
			...gridProps,
			autoHeight: true,
			isScrolling,
			scrollTop,
			onScroll: onChildScroll,
		}),
		[isScrolling, scrollTop, onChildScroll, gridProps]
	)

	return <GridList {...restProps} rect={finalRect} gridProps={finalGridProps} />
}

type GridListCellProps<T> = {
	rowIndex: number
	columnIndex: number
	style: CSSProperties
	columnCount: number
	renderer: GridReactRenderer<any>
	gap: number
	data: T[]
	isScrolling: boolean
}

const GridListCell = memo(function GridListCell<T>(props: GridListCellProps<T>) {
	const { renderer, rowIndex, columnCount, columnIndex, style, gap, data, isScrolling } = props
	const index = rowIndex * columnCount + columnIndex
	const finalStyle = useMemo<CSSProperties>(
		() => ({
			position: "absolute",
			width: style.width,
			height: style.height,
			top: style.top,
			left: style.left,
			...getStylesWithGap(gap, columnIndex, columnCount),
		}),
		[columnCount, columnIndex, gap, style]
	)
	const item = data[index]
	const children = useMemo(() => renderer(item, index, isScrolling), [item, index, renderer, isScrolling])
	return <div style={finalStyle} children={children} />
})

const getStylesWithGap = (gap: number, col: number, columnCount: number) => {
	const halfGap = gap / 2
	return {
		paddingLeft: col !== 0 ? halfGap : 0,
		paddingRight: col !== columnCount - 1 ? halfGap : 0,
		paddingTop: halfGap,
		paddingBottom: halfGap,
	}
}
