import "react-virtualized/styles.css"
import React, { memo } from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, ListItem, listStateIdle } from "@rixio/list"
import { GridRect, RxGridList, RxGridListWindow } from "./index"

const delay = (timeout: number) => new Promise<number>(r => setTimeout(r, timeout))
const items = new Array(50).fill(1).map((_, i) => i)

async function load(pageSize: number, c: number | null): Promise<[number[], number]> {
	await delay(1000)
	const current = c || 0
	return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<number, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, { initial: "fake" })

const Memoized = memo(({ item }: { item: ListItem<number> }) => {
	if (item && item.type === "item") {
		return (
			<article style={{ display: "flex", height: "100%", background: "grey" }} key={item.value.toString()}>
				<h3>{item.value}</h3>
			</article>
		)
	}
	return <div>Loading..</div>
})

const renderer = (item: ListItem<number>) => <Memoized item={item} />
const rect: GridRect = {
	rowHeight: 300,
	columnCount: 5,
	gap: 16,
	height: 500,
	width: 1000,
}

storiesOf("grid-window-list", module)
	.add("basic", () => (
		<React.Fragment>
			<RxGridList data$={list$} rect={rect} threshold={1} renderer={renderer} />
			<div>Content from bottom</div>
		</React.Fragment>
	))
	.add("with window-scroller", () => (
		<React.Fragment>
			<RxGridListWindow data$={list$} rect={rect} threshold={1} renderer={renderer} />
			<div>Content from bottom</div>
		</React.Fragment>
	))
