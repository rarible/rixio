import "react-virtualized/styles.css"
import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, listStateIdle } from "@rixio/list"
import { createListRenderer, RxVerticalList, RxVerticalListWindow } from "./index"

const delay = (timeout: number) => new Promise<number>(r => setTimeout(r, timeout))
function randomNumber(min: number, max: number) {
	const r = Math.random() * (max - min) + min
	return Math.floor(r)
}
type Item = {
	index: number
	height: number
}
const items = new Array(100).fill(1).map((_, i) => ({
	index: i,
	height: randomNumber(100, 300),
})) as Item[]

async function load(pageSize: number, c: number | null): Promise<[Item[], number]> {
	await delay(1500)
	const current = c || 0
	return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<Item, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, { initial: "fake" })

const renderer = createListRenderer<Item>(
	x => (
		<div style={{ display: "flex", margin: 10, background: "grey", height: x.height }} key={x.toString()}>
			<h3 style={{ margin: 0 }}>{x.height}</h3>
		</div>
	),
	<div style={{ margin: 10 }}>Loading..</div>
)

const rect = {
	width: 500,
	minRowHeight: 100,
	height: 400,
}

storiesOf("vertical-list", module)
	.add("basic", () => (
		<RxVerticalList data$={list$} pending={pending} rejected={rejected} rect={rect} renderer={renderer} />
	))
	.add("with window-scroller", () => (
		<RxVerticalListWindow data$={list$} pending={pending} rejected={rejected} rect={rect} renderer={renderer} />
	))

const rejected = () => <div>Some error</div>
const pending = <div>First load</div>
