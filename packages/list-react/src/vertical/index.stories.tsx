import "react-virtualized/styles.css"
import React, { useEffect } from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import { InfiniteList, InfiniteListState, ListItem, listStateIdle } from "@rixio/list"
import { ListReactRenderer } from "../domain"
import { RxVerticalList, RxVerticalListWindow } from "./index"

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

type BlockProps = {
	height: number | string
	children: React.ReactNode
}
const Block = ({ height, children }: BlockProps) => {
	return (
		<div style={{ background: "grey", height }}>
			{children}
		</div>
	)
}

type Props = {
	item: ListItem<Item>
	isScrolling: boolean
	onRender: () => void
}
const Comp = ({ item, ...rest }: Props) => {
	if (item && item.type === "item") {
		return <Loaded item={item.value} {...rest} />
	}
	return <Block height="auto" children="Loading.." />
}

type LoadedProps = Omit<Props, "item"> & {
	item: Item
}
const Loaded = ({ item, onRender, isScrolling }: LoadedProps) => {
	useEffect(() => {
		onRender()
	}, [onRender])

	return (
		<Block height={item.height}>
			<span>{isScrolling ? "scrolling" : item.height}</span>
		</Block>
	)
}
const renderer: ListReactRenderer<ListItem<Item>> = (item, onMeasure, isScrolling) => {
	return <Comp item={item} onRender={onMeasure} isScrolling={isScrolling} />
}

const rect = {
	width: 500,
	minRowHeight: 100,
	height: 400,
	gap: 32
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
