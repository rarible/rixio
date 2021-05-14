import React, { useCallback, useMemo } from "react"
import type { Index, WindowScrollerChildProps } from "react-virtualized"
import { InfiniteLoader, InfiniteLoaderProps } from "react-virtualized/dist/es/InfiniteLoader"
import { List, ListProps, ListRowProps } from "react-virtualized/dist/es/List"
import { CellMeasurerCache, CellMeasurer } from "react-virtualized/dist/es/CellMeasurer"
import { WindowScroller } from "react-virtualized/dist/es/WindowScroller"
import { isFakeItem } from "@rixio/list"
import type { ListReactRenderer } from "../domain"
import { liftReactList, RxReactListProps } from "../rx"
import { identity } from "../utils"

export type VerticalListRect = {
	width: number
	height: number
	minRowHeight: number
	gap: number
}

export type VerticalListProps<T> = Partial<Pick<InfiniteLoaderProps,  "threshold">> & {
	renderer: ListReactRenderer<T>
	data: T[]
	minimumBatchRequest?: number
	rect: VerticalListRect
	listProps?: Partial<ListProps>
	loadNext: () => void
	mapKey?: (key: string) => string
}

export function VerticalList<T>(props: VerticalListProps<T>) {
	const { mapKey = identity, data, rect, minimumBatchRequest, renderer, listProps = {}, loadNext, ...restProps } = props
	const isRowLoaded = useCallback(({ index }: Index) => index < data.length && !isFakeItem(data[index]), [data])
	const loadMoreRows = useCallback(() => Promise.resolve(loadNext()), [loadNext])
	const cellMeasurerCache = useMemo(
		() =>
			new CellMeasurerCache({
				fixedWidth: true,
				minHeight: rect.minRowHeight,
				defaultHeight: rect.minRowHeight,
				defaultWidth: rect.width,
			}),
		[rect.minRowHeight, rect.width]
	)

	const rowRenderer = useCallback(
		({ key, ...rest }: ListRowProps) => (
			<VerticalListRow<T> 
				{...rest}
				key={mapKey(key)}
				rowCount={data.length}
				gap={rect.gap}
				cellMeasurerCache={cellMeasurerCache} 
				renderer={renderer}
				data={data}
			/>
		),
		[data, mapKey, rect.gap, renderer, cellMeasurerCache]
	)

	return (
		<InfiniteLoader 
			minimumBatchSize={minimumBatchRequest} 
			rowCount={Infinity} 
			isRowLoaded={isRowLoaded} 
			loadMoreRows={loadMoreRows} 
			{...restProps}
		>
			{({ registerChild, onRowsRendered, ...rest }) => (
				<List
					renderer={renderer}
					data={data}
					deferredMeasurementCache={cellMeasurerCache}
					rowRenderer={rowRenderer}
					rowHeight={cellMeasurerCache.rowHeight}
					rowCount={data.length}
					onRowsRendered={onRowsRendered}
					{...rest}
					{...listProps}
					width={rect.width}
					height={rect.height}
					ref={registerChild}
				/>
			)}
		</InfiniteLoader>
	)
}

export type VerticalListWindowRect = Omit<VerticalListRect, "height">
export type VerticalListWindowProps<T> = Omit<VerticalListProps<T>, "rect"> & {
	rect: VerticalListWindowRect
}
export function VerticalListWindow<T>(props: VerticalListWindowProps<T>) {
	return <WindowScroller>{childProps => <VerticalListWindowChild {...childProps} {...props} />}</WindowScroller>
}

export type RxVerticalListWindowProps<T> = RxReactListProps<T, VerticalListWindowProps<T>>
export const RxVerticalListWindow: <T>(props: RxVerticalListWindowProps<T>) => JSX.Element | null = liftReactList(
	VerticalListWindow
) as any

type VerticalListWindowChildProps<T> = VerticalListWindowProps<T> &
	WindowScrollerChildProps & {
		height: number
	}
function VerticalListWindowChild<T>(props: VerticalListWindowChildProps<T>) {
	const { height, rect, isScrolling, scrollTop, onChildScroll, listProps = {}, ...restProps } = props
	const finalRect = useMemo(() => ({ ...rect, height }), [height, rect])

	const finalListProps = useMemo(
		() => ({
			...listProps,
			autoHeight: true,
			isScrolling,
			scrollTop,
			onScroll: onChildScroll,
		}),
		[isScrolling, scrollTop, onChildScroll, listProps]
	)

	return <VerticalList {...restProps} rect={finalRect} listProps={finalListProps} />
}

export type VerticalListRowProps<T> = ListRowProps & {
	data: T[]
	cellMeasurerCache: CellMeasurerCache
	renderer: ListReactRenderer<T>
	gap: number
	rowCount: number
}
export function VerticalListRow<T>(props: VerticalListRowProps<T>) {
	const { cellMeasurerCache, rowCount, renderer, parent, gap, data, index, style, isScrolling } = props
	return (
		<CellMeasurer columnIndex={0} rowIndex={index} parent={parent} cache={cellMeasurerCache}>
			{({ measure }) => (
				<div style={getStylesWithGap(style, gap, index, rowCount)}>
					{renderer(data[index], measure, isScrolling)}
				</div>
			)}
		</CellMeasurer>
	)
}

export type RxVerticalListProps<T> = RxReactListProps<T, VerticalListProps<T>>
export const RxVerticalList: <T>(props: RxVerticalListProps<T>) => JSX.Element | null = liftReactList(
	VerticalList
) as any

const getStylesWithGap = (styles: Object, gap: number, row: number, rowCount: number) => {
	return {
		...styles,
		paddingBottom: row === rowCount - 1 ? 0 : gap,
	}
}
