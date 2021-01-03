import "react-virtualized/styles.css"
import React, { memo } from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, ListItem, listStateIdle, mapperFactory } from "@rixio/list"
import { RxGridWindowList } from "./index"

export function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
const items = new Array(50).fill(1).map((_, i) => i)

async function load(pageSize: number, c: number | null): Promise<[number[], number]> {
	await delay(1000)
	const current = c || 0
	return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<number, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, mapperFactory({ initial: "fake" }))

const Memoized = memo(({ item }: { item: ListItem<number> }) => {
	if (!item) {
		return null
	}
	if (item.type === "item") {
		return (
			<article style={{ display: "flex", height: "100%", background: "grey" }} key={item.value.toString()}>
				<h3>{item.value}</h3>
			</article>
		)
	}
	return <div>Loading..</div>
})

const renderer = (item: ListItem<number>) => {
	return <Memoized item={item} />
}

const rect = {
	rowHeight: 300,
	columnCount: 5,
	gap: 16,
	width: 1000,
}

storiesOf("grid-window-list", module).add("basic", () => (
	<React.Fragment>
		<div
			dangerouslySetInnerHTML={{
				__html: `
					<style>
						* { 
							box-sizing: border-box; 
						}
						.sb-show-main.sb-main-padded {
							margin: 0;
							padding: 0;
						}
					</style>
				`,
			}}
		/>
		<RxGridWindowList data$={list$} rect={rect} threshold={1} renderer={renderer} />
		<div>Content from bottom</div>
	</React.Fragment>
))
