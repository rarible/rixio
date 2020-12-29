import "react-virtualized/styles.css"
import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, ListItem, listStateIdle, mapperFactory } from "@rixio/list";
import { ListReactRenderer } from "../domain"
import { RxVerticalList } from "./index";
export function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
const items = new Array(100).fill(1).map((_, i) => i)

async function load(pageSize: number, c: number | null): Promise<[number[], number]> {
	await delay(1500)
	const current = c || 0
	return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<number, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, mapperFactory({ initial: "fake" }))

const renderer: ListReactRenderer<ListItem<number>> = item => {
	if (item.type === "item") {
		return (
			<article style={{ display: "flex", height: "100%", background: "grey" }} key={item.value.toString()}>
				<h3>{item.value}</h3>
			</article>
		)
	}
	return <div>Loading..</div>
}

storiesOf("vertical-list", module).add("basic", () => (
	<RxVerticalList
		data$={list$}
		pending={<div>First load</div>}
		rejected={() => <div>Some error</div>}
		rect={{
			width: 500,
			height: 400,
			gap: 10,
			rowHeight: 60,
		}}
		renderer={renderer}
	/>
))
