import React, { useCallback, useMemo } from "react"
import { Rx } from "@rixio/rxjs-react"
import { InfiniteList } from "@rixio/list"
import { InfiniteListState } from "@rixio/list"
import { InfiniteLoader } from "react-virtualized/dist/es/InfiniteLoader"
import { Grid, GridProps, RenderedSection } from "react-virtualized/dist/es/Grid"
import { WindowScroller } from "react-virtualized/dist/es/WindowScroller"
import { AutoSizer } from "react-virtualized/dist/es/AutoSizer"
import type { Index } from "react-virtualized"
import { InfiniteListProps } from "@rixio/list/build/component"
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
}

export function GridWindowList<T, C>({
	state$,
	rect,
	renderer,
	gridProps = {},
	...restProps
}: GridWindowListProps<T, C>) {
	const pending = useMemo(() => new Array(rect.columnCount).fill({ type: "pending" }), [rect.columnCount])

	const children = useCallback(
		(load: () => Promise<void>, { items, status, finished }: InfiniteListState<T, C>) => {
			const itemRowCount = Math.ceil(items.length / rect.columnCount)
			const rowCount = status === "pending" ? itemRowCount + 1 : itemRowCount
			const renderableRaw = items.map(x => ({ type: "item", data: x }))
			const renderable = (status === "pending"
				? [...renderableRaw, ...pending]
				: renderableRaw) as ListReactRendererItem<T>[]
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
															{renderer(renderable[rowIndex * rect.columnCount + columnIndex])}
														</div>
													)
												}}
												{...gridProps}
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
		[renderer, gridProps, rect, pending]
	)

	return (
		<Rx value$={state$}>
			{state => <InfiniteList state$={state$} children={load => children(load, state)} {...restProps} />}
		</Rx>
	)
}
