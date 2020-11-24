import "react-virtualized/styles.css"
import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/rxjs-atom"
import { listStateIdle } from "@rixio/list"
import { ListReactRendererItem } from "../domain"
import { GridWindowList } from "./index"

export function delay(timeout: number): Promise<number> {
	return new Promise(resolve => setTimeout(resolve, timeout))
}
const items = new Array(100).fill(1).map((_, i) => i)

async function load(c: number | null): Promise<[number[], number]> {
	await delay(1500)
	const current = c || 0
	return [items.slice(current, current + 10), current + 10]
}

const state$ = Atom.create(listStateIdle)

const renderer = (item: ListReactRendererItem<number>) => {
	if (!item) {
		return null
	}
	if (item.type === "item") {
		return (
			<article style={{ display: "flex", height: "100%", background: "grey" }} key={item.data.toString()}>
				<h3>{item.data}</h3>
			</article>
		)
	}
	return <div>Loading..</div>
}

storiesOf("grid-window-list", module).add("basic", () => (
	<React.Fragment>
		<div
			dangerouslySetInnerHTML={{
				__html: "<style>* { box-sizing: border-box }</style>",
			}}
		/>
		<GridWindowList<number, number>
			state$={state$}
			loader={load}
			pending={<div>First load</div>}
			rejected={() => <div>Some error</div>}
			rect={{
				rowHeight: 300,
				columnCount: 5,
				gap: 16,
			}}
			renderer={renderer}
		/>
	</React.Fragment>
))
