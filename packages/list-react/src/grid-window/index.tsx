import React, { memo, useCallback, useMemo, useRef } from "react"
import { RenderInfo, RxInfiniteList } from "@rixio/list"
import { InfiniteListProps } from "@rixio/list/build/component"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { Grid, GridCellRenderer, GridProps, RenderedSection } from "react-virtualized/dist/es/Grid"
import { WindowScroller } from "react-virtualized/dist/es/WindowScroller"
import { AutoSizer } from "react-virtualized/dist/es/AutoSizer"
import type { Index } from "react-virtualized"
import { ListReactRenderer, ListReactRendererItem } from "../domain"

export type GridRect = {
	rowHeight: number
	columnCount: number
	gap: number
}

export type GridWindowListProps<T, C> = Omit<InfiniteListProps<T, C>, "children"> & {
	rect: GridRect
	renderer: ListReactRenderer<T>
	gridProps?: Partial<GridProps>
	threshold?: number
	minimumBatchRequest?: number
	absolute?: boolean
}

export function GridWindowList<T, C>({
	state$,
	rect,
	minimumBatchRequest,
	renderer,
	gridProps = {},
	threshold,
	absolute,
	...restProps
}: GridWindowListProps<T, C>) {
	const pending = useMemo(() => new Array(rect.columnCount).fill({ type: "pending" }), [rect.columnCount])
	const onRowsRenderedRef = useRef<((params: RenderedSection) => any) | undefined>()

	const children = useCallback(
		({ load, items, status, finished }: RenderInfo<T, C>) => {
			const itemRowCount = Math.ceil(items.length / rect.columnCount)
			const rowCount = finished ? itemRowCount : itemRowCount + 1
			const raw = items.map(x => ({ type: "item", data: x }))
			const renderableItems = (status === "pending" ? [...raw, ...pending] : raw) as ListReactRendererItem<T>[]
			const isRowLoaded = ({ index }: Index) => finished || index < rowCount - 1

			const cellRenderer: GridCellRenderer = ({ key, style, columnIndex, rowIndex }) => (
				<GridWindowListCell
					gap={rect.gap}
					style={style}
					rowIndex={rowIndex}
					columnIndex={columnIndex}
					key={key}
					columnCount={rect.columnCount}
					rowCount={rowCount}
					renderer={renderer}
					items={renderableItems}
				/>
			)

			return (
				<InfiniteLoader
					threshold={threshold}
					isRowLoaded={isRowLoaded}
					rowCount={Infinity}
					loadMoreRows={load}
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
								{({ height, isScrolling, scrollTop, scrollLeft }) => (
									<AutoSizer disableHeight={!absolute}>
										{({ width }) => (
											<Grid
												columnCount={rect.columnCount}
												scrollTop={scrollTop}
												scrollLeft={scrollLeft}
												columnWidth={width / rect.columnCount}
												rowCount={rowCount}
												rowHeight={rect.rowHeight}
												isScrolling={isScrolling}
												cellRenderer={cellRenderer}
												{...gridProps}
												autoHeight
												height={height}
												width={width}
												ref={registerChild}
												onSectionRendered={onRowsRenderedRef.current}
											/>
										)}
									</AutoSizer>
								)}
							</WindowScroller>
						)
					}}
				</InfiniteLoader>
			)
		},
		[rect, absolute, pending, threshold, minimumBatchRequest, renderer, gridProps]
	)

	return <RxInfiniteList state$={state$} children={children} {...restProps} />
}

type GridWindowListCellProps = {
	rowIndex: number
	columnIndex: number
	style: React.CSSProperties
	columnCount: number
	renderer: ListReactRenderer<any>
	gap: number
	rowCount: number
	items: ListReactRendererItem<any>[]
}

const getStylesWithGap = (gap: number, row: number, col: number, rowCount: number, columnCount: number) => ({
	paddingLeft: col !== 0 ? gap / 2 : 0,
	paddingRight: col !== columnCount - 1 ? gap / 2 : 0,
	paddingTop: row !== 0 ? gap : 0,
	paddingBottom: row !== rowCount - 1 ? gap / 2 : 0,
})

const GridWindowListCell = memo(function GridWindowListCell({
	renderer,
	rowIndex,
	columnCount,
	columnIndex,
	style,
	gap,
	items,
	rowCount,
}: GridWindowListCellProps) {
	const index = rowIndex * columnCount + columnIndex
	const finalStyle = useMemo(
		() => ({ ...style, ...getStylesWithGap(gap, rowIndex, columnIndex, rowCount, columnCount) }),
		[columnCount, columnIndex, gap, rowCount, rowIndex, style]
	)
	const item = items[index]
	const children = useMemo(() => renderer(item), [item, renderer])
	return <div style={finalStyle} children={children} />
})
