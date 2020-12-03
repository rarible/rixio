import React, { ReactElement } from "react"
import { act, render, waitFor, fireEvent } from "@testing-library/react"
import { Atom } from "@rixio/rxjs-atom"
import { R } from "@rixio/rxjs-react"
import { BehaviorSubject, Observable, ReplaySubject, defer } from "rxjs"
import { createFulfilledWrapped, pendingWrapped, Wrapped } from "@rixio/rxjs-wrapped"
import { CacheImpl, createFulfilledCache, idleCache, KeyCacheImpl } from "@rixio/rxjs-cache"
import { Map as IM } from "immutable"
import { toListDataLoader } from "@rixio/rxjs-cache/build/key"
import waitForExpect from "wait-for-expect"
import { Rx } from "./rx"

const Testing = ({ text, reload }: { text?: any; reload?: () => void }) => {
	return (
		<>
			<span data-testid="testing">{text || "BLABLABLA"}</span>
			<button data-testid="reload" onClick={reload}>
				reload
			</button>
		</>
	)
}

describe("Rx", () => {
	test("should display pending if is pending", async () => {
		expect.assertions(2)
		const state$ = Atom.create<Wrapped<string>>(pendingWrapped)
		const r = render(
			<span data-testid="test">
				<Rx value$={state$} pending="pending">
					{v => <span>{v}</span>}
				</Rx>
			</span>
		)
		await expect(r.getByTestId("test")).toHaveTextContent("pending")
		await expect(r.getByTestId("test")).not.toHaveTextContent("content")
	})

	test("should display content if loaded", async () => {
		testCacheState(state$ => (
			<span data-testid="test">
				<Rx<number> value$={state$} pending="pending">
					{value => <span>{value}</span>}
				</Rx>
			</span>
		))
	})

	test("should display content if simple observable is used", async () => {
		const subj = new ReplaySubject<number>(1)
		const r = render(
			<span data-testid="test">
				<Rx value$={subj} pending="pending" />
			</span>
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

	test("Rx should work with cache", async () => {
		let value: number = 10
		const cache = new CacheImpl<number>(Atom.create(idleCache), () => Promise.resolve(value))
		const r = render(
			<span data-testid="test">
				<Rx value$={cache} pending="pending" />
			</span>
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
			cache.atom.set(createFulfilledCache(30))
		})
		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent("30")
		})
	})

	test("Rx should work with key cache", async () => {
		let value: number = 10
		const cache = new KeyCacheImpl<string, number>(
			Atom.create(IM()),
			toListDataLoader(() => Promise.resolve(value))
		)
		const r = render(
			<span data-testid="test">
				<Rx value$={cache.single("key1")} pending="pending" />
			</span>
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
			cache.single("key1").atom.set(createFulfilledCache(30))
		})
		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent("30")
		})
	})

	test("should display error if simple observable is used", async () => {
		const subj = new ReplaySubject<number>(1)
		const r = render(
			<span data-testid="test">
				<Rx value$={subj} pending="pending" rejected={x => x} />
			</span>
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
				<Rx value$={obs} pending="pending" rejected={(err, reload) => <Testing text={err} reload={reload}/>} />
			</span>
		)
		await waitForExpect(() => {
			expect(r.getByTestId("testing")).toHaveTextContent(text)
		})
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		await waitForExpect(() => {
			expect(r.getByTestId("testing")).toHaveTextContent(text)
		})
		const successText = Math.random().toString()
		promise = Promise.resolve(successText)
		act(() => {
			fireEvent.click(r.getByTestId("reload"))
		})
		await waitForExpect(() => {
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
					<R.span>{state$}</R.span>
				</Rx>
			</span>
		))
	})

	test("should work with null atom's value", async () => {
		const state$ = Atom.create(null)
		const r = render(
			<span data-testid="test">
				<Rx value$={state$}>{v => <span>{`${v}`}</span>}</Rx>
			</span>
		)
		await expect(r.getByTestId("test")).toHaveTextContent("null")
	})
})

function testCacheState(comp: (state: Observable<Wrapped<number>>) => ReactElement) {
	const state$ = new BehaviorSubject<Wrapped<number>>(pendingWrapped)
	const r = render(comp(state$))
	expect(r.getByTestId("test")).toHaveTextContent("pending")
	const number = Math.random()
	act(() => {
		state$.next(createFulfilledWrapped(number))
	})
	expect(r.getByTestId("test")).toHaveTextContent(number.toString())
}
