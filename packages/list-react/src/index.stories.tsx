import React from "react"
import { storiesOf } from "@storybook/react"
import { Atom } from "@rixio/rxjs-atom";
import { listStateIdle } from "@rixio/list";
import { ScrollableInfiniteList } from "./index"

type SampleData = {
  userId: number
  id: number
  title: string
  body: string
}

export function delay(timeout: number): Promise<number> {
  return new Promise(resolve => setTimeout(resolve, timeout))
}

async function load(c: number | null): Promise<[SampleData[], number]> {
  await delay(1500)
  const current = c || 0
  const items: SampleData[] = await (await fetch("https://jsonplaceholder.typicode.com/posts")).json()
  return [items.slice(current, current + 10), current + 10]
}

const state$ = Atom.create(listStateIdle<SampleData, number>())

storiesOf("scrollable-infinite-list", module)
  .add("basic", () => (
    <ScrollableInfiniteList<SampleData, number>
      state$={state$}
      loader={load}
      pending={<div>Part is loading</div>}
      itemRenderer={item => (
        <article key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </article>
      )}
    />
  ))
