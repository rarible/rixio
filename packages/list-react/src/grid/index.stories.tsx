import "react-virtualized/styles.css"
import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/atom"
import type { InfiniteListState, ListItem } from "@rixio/list"
import { InfiniteList, listStateIdle } from "@rixio/list"
import type { GridReactRenderer } from "../domain"
import type { GridRect } from "./index"
import { RxGridList, RxGridListWindow } from "./index"

const delay = (timeout: number) => new Promise<number>(r => setTimeout(r, timeout))
const items = new Array(100).fill(1).map((_, i) => i)

async function load(pageSize: number, c: number | null): Promise<[number[], number]> {
  await delay(1000)
  const current = c || 0
  return [items.slice(current, current + pageSize), current + pageSize]
}

const state$ = Atom.create<InfiniteListState<number, number>>(listStateIdle)
const list$ = new InfiniteList(state$, load, 20, { initial: "wrapped" })

const Comp = ({ item, index }: { index: number; item: ListItem<number> }) => {
  if (item) {
    if (item.type === "item") {
      return (
        <article style={{ display: "flex", height: "100%", background: "grey" }} key={item.value.toString()}>
          <h3>
            {item.value}-{index}
          </h3>
        </article>
      )
    }
    if (item.type === "pending") {
      return <div>Loading..</div>
    }
  }
  return null
}

const renderer: GridReactRenderer<ListItem<number>> = (item, index) => {
  return <Comp item={item} index={index} />
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
