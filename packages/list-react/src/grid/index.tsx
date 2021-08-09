import React, { CSSProperties, memo, useCallback, useMemo, useRef, useState } from "react"
import { isFakeItem } from "@rixio/list"
import { InfiniteLoader, InfiniteLoaderProps } from "react-virtualized/dist/es/InfiniteLoader"
import { Grid, GridCellRenderer, GridProps, RenderedSection } from "react-virtualized/dist/es/Grid"
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
	rowsToPreview?: number
	loadButton?: (onClick: () => void) => React.ReactElement
	minimumBatchRequest?: number
	rect: GridRect
	gridProps?: Partial<GridProps>
	pendingSize?: number
	loadNext: () => void
	mapKey?: (key: string) => string
}

export function GridList<T>({
	mapKey = identity,
	loadButton,
	rowsToPreview = 2,
	data,
	rect,
	minimumBatchRequest = 10,
	renderer,
	gridProps = {},
	threshold = 3,
	loadNext,
}: GridListProps<T>) {
	const [preview, setPreview] = useState(() => Boolean(loadButton))
	const onSectionRendered = useRef<(r: RenderedSection) => void>()

	const renderable = useMemo(() => {
		return preview ? data.slice(0, rect.columnCount * rowsToPreview) : data
	}, [preview, data, rowsToPreview, rect.columnCount])

	const rowCount = useMemo(() => Math.ceil(renderable.length / rect.columnCount), [renderable.length, rect.columnCount])

	const isRowLoaded = useCallback(
		({ index }: Index) => {
			const rowStart = rect.columnCount * index
			return rowStart < renderable.length && !isFakeItem(renderable[rowStart])
		},
		[renderable, rect.columnCount]
	)

	const loadMoreRows = useCallback<(params: IndexRange) => Promise<any>>(async () => loadNext(), [loadNext])
	const cellRenderer = useCallback<GridCellRenderer>(
		({ key, ...restCellProps }) => (
			<GridListCell
				gap={rect.gap}
				columnCount={rect.columnCount}
				renderer={renderer}
				data={renderable}
				key={mapKey(key)}
				{...restCellProps}
			/>
		),
		[renderable, mapKey, rect.columnCount, rect.gap, renderer]
	)

	const loadMoreSection = useMemo(() => {
		if (preview && loadButton && data > renderable) {
			const last = data[rowsToPreview * rect.columnCount]
			if (last && !isFakeItem(last)) {
				return loadButton(() => setPreview(false))
			}
		}
		return null
	}, [preview, loadButton, renderable, data, rect, rowsToPreview])

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
							ref={registerChild}
							onSectionRendered={onSectionRendered.current}
						/>
					)
				}}
			</InfiniteLoader>
			{loadMoreSection}
		</React.Fragment>
	)
}

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
