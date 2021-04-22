import "react-virtualized/styles.css"
import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, ListItem, listStateIdle } from "@rixio/list"
import { GridReactRenderer } from "../domain"
import { GridRect, RxGridList, RxGridListWindow } from "./index"

const delay = (timeout: number) => new Promise<number>(r => setTimeout(r, timeout))
const items = new Array(12).fill(1).map((_, i) => i)

async function load(pageSize: number, c: number | null): Promise<[number[], number]> {
	await delay(1000)
	const current = c || 0
	return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<number, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, { initial: "wrapped" })

const Comp = ({ item, isScrolling }: { item: ListItem<number>; isScrolling: boolean }) => {
	if (item) {
		if (item.type === "item") {
			return (
				<article style={{ display: "flex", height: "100%", background: "grey" }} key={item.value.toString()}>
					<h3>{isScrolling ? "scrolling" : item.value}</h3>
				</article>
			)
		}
		if (item.type === "pending") {
			return <div>Loading..</div>
		}
	}
	return null
}

const renderer: GridReactRenderer<ListItem<number>> = (item, isScrolling) => {
	return <Comp item={item} isScrolling={isScrolling} />
}
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
	.add("with throttling", () => (
		<RxGridList
			data$={list$}
			rect={rect}
			threshold={1}
			renderer={renderer}
			loadButton={load => <button onClick={load}>Load more</button>}
		/>
	))
