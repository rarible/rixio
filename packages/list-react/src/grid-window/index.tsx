import React, { useCallback, useMemo } from "react"
import { Atom } from "@rixio/rxjs-atom"
import { RenderInfo, RxInfiniteList } from "@rixio/list/src/simple"
import { InfiniteListState, ListPartLoader } from "@rixio/list"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { Grid, GridProps, RenderedSection } from "react-virtualized/dist/es/Grid"
import { WindowScroller } from "react-virtualized/dist/es/WindowScroller"
import { AutoSizer } from "react-virtualized/dist/es/AutoSizer"
import type { Index } from "react-virtualized"

export type GridRect = {
	rowHeight: number
	columnCount: number
	gap: number
}

export type GridItemRendererProps<T> =
	| {
			type: "item"
			data: T
	  }
	| {
			type: "pending"
	  }

export type GridWindowListProps<T, C> = Partial<GridProps> & {
	state$: Atom<InfiniteListState<T, C>>
	loader: ListPartLoader<T, C>
	rect: GridRect
	itemRenderer: (props: GridItemRendererProps<T>) => React.ReactNode
}

export function GridWindowList<T, C>({
	state$,
	loader,
	rect,
	itemRenderer,
	perRow,
	...listProps
}: GridWindowListProps<T, C>) {
	const pending = useMemo(
		() =>
			new Array(rect.columnCount).fill({
				type: "pending",
			}),
		[rect.columnCount]
	)
	const children = useCallback(
		({ items, finished, load, status }: RenderInfo<T, C>) => {
			const itemRowCount = Math.ceil(items.length / rect.columnCount)
			const rowCount = status === "pending" ? itemRowCount + 1 : itemRowCount
			const renderableRaw = items.map(x => ({
				type: "item",
				data: x,
			}))
			const renderable =
				status === "pending"
					? ([...renderableRaw, ...pending] as GridItemRendererProps<T>[])
					: (renderableRaw as GridItemRendererProps<T>[])

			const isRowLoaded = ({ index }: Index) => finished || index < rowCount - 1

			return (
				<InfiniteLoader threshold={1} isRowLoaded={isRowLoaded} rowCount={Infinity} loadMoreRows={load}>
					{({ registerChild, onRowsRendered }) => {
						const _onSectionRendered = ({
							rowStartIndex,
							columnStartIndex,
							columnStopIndex,
							rowStopIndex,
						}: RenderedSection) => {
							onRowsRendered({
								startIndex: rowStartIndex * rect.columnCount + columnStartIndex,
								stopIndex: rowStopIndex * rect.columnCount + columnStopIndex,
							})
						}

						return (
							<WindowScroller>
								{({ height, isScrolling, scrollTop }) => (
									<AutoSizer disableHeight>
										{({ width }) => (
											<Grid
												columnCount={rect.columnCount}
												columnWidth={width / rect.columnCount}
												rowCount={rowCount}
												scrollTop={scrollTop}
												rowHeight={rect.rowHeight}
												isScrolling={isScrolling}
												cellRenderer={({ rowIndex, columnIndex, key, style }) => {
													return (
														<div
															key={key}
															style={{
																...style,
																paddingLeft: columnIndex !== 0 ? rect.gap / 2 : 0,
																paddingRight: columnIndex !== rect.columnCount - 1 ? rect.gap / 2 : 0,
																paddingTop: rowIndex !== 0 ? rect.gap / 2 : 0,
																paddingBottom: rowIndex !== rowCount - 1 ? rect.gap / 2 : 0,
															}}
														>
															{itemRenderer(renderable[rowIndex * rect.columnCount + columnIndex])}
														</div>
													)
												}}
												{...listProps}
												autoHeight
												height={height}
												width={width}
												ref={registerChild}
												onSectionRendered={_onSectionRendered}
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
		[itemRenderer, listProps, rect, pending]
	)

	return <RxInfiniteList state$={state$} loader={loader} children={children} />
}
