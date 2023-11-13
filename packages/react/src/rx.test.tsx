import React from "react"
import { act, render, waitFor, fireEvent } from "@testing-library/react"
import { Atom } from "@rixio/atom"
import { R } from "@rixio/react"
import type { Observable } from "rxjs"
import { BehaviorSubject, ReplaySubject, defer, Subject } from "rxjs"
import type { Wrapped } from "@rixio/wrapped"
import { WrappedFulfilled, WrappedPending } from "@rixio/wrapped"
import { CacheFulfilled, CacheIdle, KeyMemoImpl, MemoImpl, toListLoader } from "@rixio/cache"
import { Map as IM } from "immutable"
import { Rx } from "./rx"

const Testing = ({ text = "BLABLABLA", reload }: { text?: any; reload?: () => void }) => {
  return (
    <React.Fragment>
      <span data-testid="testing" children={text} />
      <button data-testid="reload" onClick={reload} children="reload" />
    </React.Fragment>
  )
}

describe("Rx", () => {
  test("should display pending if is pending", async () => {
    expect.assertions(2)
    const state$ = Atom.create<Wrapped<string>>(WrappedPending.create())
    const r = render(
      <span data-testid="test">
        <Rx value$={state$} pending="pending">
          {v => <span children={v} />}
        </Rx>
      </span>,
    )
    expect(r.getByTestId("test")).toHaveTextContent("pending")
    expect(r.getByTestId("test")).not.toHaveTextContent("content")
  })

  test("should display content if loaded", async () => {
    testCacheState(state$ => (
      <span data-testid="test">
        <Rx<number> value$={state$} pending="pending">
          {v => <span children={v} />}
        </Rx>
      </span>
    ))
  })

  test("should display content if simple observable is used", async () => {
    const subj = new ReplaySubject<number>(1)
    const r = render(
      <span data-testid="test">
        <Rx value$={subj} pending="pending" />
      </span>,
    )
    expect(r.getByTestId("test")).toHaveTextContent("pending")
    const number = Math.random()
    act(() => {
      subj.next(number)
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent(number.toString())
    })
  })

  test("Rx should work with Memo", async () => {
    let value: number = 10
    const cache = new MemoImpl<number>(Atom.create(CacheIdle.create()), () => Promise.resolve(value))
    const r = render(
      <span data-testid="test">
        <Rx value$={cache} pending="pending" />
      </span>,
    )
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("10")
    })
    act(() => {
      value = 20
      cache.clear()
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("20")
    })
    act(() => {
      cache.atom.set(CacheFulfilled.create(30))
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("30")
    })
  })

  test("Rx should work with Memo and reload", async () => {
    let counter = 0
    const cache = new MemoImpl<string>(Atom.create(CacheIdle.create()), () => {
      counter = counter + 1
      return new Promise<string>((resolve, reject) => {
        setTimeout(() => (counter <= 1 ? reject("my-error") : resolve("resolved")), 0)
      })
    })
    const r = render(
      <span data-testid="test">
        <Rx value$={cache} pending="pending" rejected={(err, reload) => <Testing text={err} reload={reload} />} />
      </span>,
    )
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("my-error")
    })
    act(() => {
      fireEvent.click(r.getByTestId("reload"))
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("resolved")
    })
  })

  test("Rx should work with KeyMemo", async () => {
    let value: number = 10
    const cache = new KeyMemoImpl<string, number>({
      map: Atom.create(IM()),
      loader: toListLoader(() => Promise.resolve(value)),
    })
    const r = render(
      <span data-testid="test">
        <Rx value$={cache.single("key1")} pending="pending" />
      </span>,
    )
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("10")
    })
    act(() => {
      value = 20
      cache.single("key1").clear()
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("20")
    })
    act(() => {
      cache.single("key1").atom.set(CacheFulfilled.create(30))
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("30")
    })
  })

  test("should show rejected if error occured after success", async () => {
    const subj = new Subject<number>()
    const r = render(
      <span data-testid="test">
        <Rx value$={subj} pending="pending" rejected={x => x} />
      </span>,
    )
    expect(r.getByTestId("test")).toHaveTextContent("pending")
    act(() => {
      subj.next(10)
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("10")
    })
    act(() => {
      subj.error("error1")
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent("error1")
    })
  })

  test("should display error if simple observable is used", async () => {
    const subj = new ReplaySubject<number>(1)
    const r = render(
      <span data-testid="test">
        <Rx value$={subj} pending="pending" rejected={x => x} />
      </span>,
    )
    expect(r.getByTestId("test")).toHaveTextContent("pending")
    const text = Math.random().toString()
    act(() => {
      subj.error(text)
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent(text)
    })
  })

  test("should resubscribe to observable if reloaded", async () => {
    const text = Math.random().toString()
    let promise: Promise<string> = Promise.reject(text)
    const obs = defer(() => promise)
    const r = render(
      <span data-testid="test">
        <Rx value$={obs} pending="pending" rejected={(err, reload) => <Testing text={err} reload={reload} />} />
      </span>,
    )
    await waitFor(() => {
      expect(r.getByTestId("testing")).toHaveTextContent(text)
    })
    act(() => {
      fireEvent.click(r.getByTestId("reload"))
    })
    await waitFor(() => {
      expect(r.getByTestId("testing")).toHaveTextContent(text)
    })
    const successText = Math.random().toString()
    promise = Promise.resolve(successText)
    act(() => {
      fireEvent.click(r.getByTestId("reload"))
    })
    await waitFor(() => {
      expect(r.getByTestId("test")).toHaveTextContent(successText)
    })
  })

  test("should display content if children empty", async () => {
    testCacheState(state$ => (
      <span data-testid="test">
        <Rx value$={state$} pending="pending" />
      </span>
    ))
  })

  test("should work if render prop is not used", () => {
    testCacheState(state$ => (
      <span data-testid="test">
        <Rx value$={state$} pending="pending">
          simple text
          <div>multiple elements</div>
          <R.span children={state$} />
        </Rx>
      </span>
    ))
  })

  test("should work with null atom's value", async () => {
    const state$ = Atom.create(null)
    const r = render(
      <span data-testid="test">
        <Rx value$={state$}>{v => <span children={`${v}`} />}</Rx>
      </span>,
    )
    expect(r.getByTestId("test")).toHaveTextContent("null")
  })
})

function testCacheState(comp: (state: Observable<Wrapped<number>>) => React.ReactElement) {
  const state$ = new BehaviorSubject<Wrapped<number>>(WrappedPending.create())
  const r = render(comp(state$))
  expect(r.getByTestId("test")).toHaveTextContent("pending")
  const number = Math.random()
  act(() => {
    state$.next(WrappedFulfilled.create(number))
  })
  expect(r.getByTestId("test")).toHaveTextContent(number.toString())
}
