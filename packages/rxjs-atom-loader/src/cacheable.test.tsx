import { Cache, CacheImpl } from "./cache"
import { Atom } from "@grecha/rxjs-atom"
import { createLoadingStateIdle } from "./loading-state"
import { act, render, waitFor, fireEvent } from "@testing-library/react"
import React, { ReactElement } from "react"
import { ReplaySubject, Subject } from "rxjs"
import { first } from "rxjs/operators"
import { Cacheable } from "./cacheable"
import { R } from "@grecha/rxjs-react"

describe("Cacheable", () => {
	test("should work with single item", async () => {
		await testSingle(cache => (
			<span data-testid="test">
				<Cacheable cache={cache}>{v => v}</Cacheable>
			</span>
		))
	})

	test("should work without children", async () => {
		await testSingle(cache => (
			<span data-testid="test">
				<Cacheable cache={cache}/>
			</span>
		))
	})

	test("should work without render props", async () => {
		await testSingle(cache => (
			<span data-testid="test">
				<Cacheable cache={cache}><R.span>{cache.atom.lens("value")}</R.span></Cacheable>
			</span>
		))
	})

	test("should work with some items", async () => {
		await testPair((cache1, cache2) =>
			<span data-testid="test">
				<Cacheable cache={[cache1, cache2]}>{([v1, v2]) => `${v1} ${v2}`}</Cacheable>
			</span>,
		)
	})

	test("should work with some items without children", async () => {
		await testPair((cache1, cache2) =>
			<span data-testid="test">
				<Cacheable cache={[cache1, cache2]}/>
			</span>,
		)
	})

	test("should show error with working reload", async () => {
		const [cache1, value1] = genCache<string>(0)
		const [cache2, value2] = genCache<number>(0)

		const r = render(
			<span data-testid="test">
				<Cacheable cache={[cache1, cache2]} loading="loading" error={((error, load) => <button onClick={load}>reload</button>)}/>
			</span>,
		)
		expect(r.getByTestId("test")).toHaveTextContent("loading")
		const num = Math.random()
		act(() => {
			value1.error("error occured")
			value2.next(num)
		})
		const text = Math.random().toString()
		await waitFor(() => {
			value1.next(text)
			expect(r.getByTestId("test")).toHaveTextContent("reload")
		})

		act(() => {
			fireEvent.click(r.getByText("reload"))
		})

		await waitFor(() => {
			expect(r.getByTestId("test")).toHaveTextContent(text)
			expect(r.getByTestId("test")).toHaveTextContent(num.toString())
		})
	})
})

async function testSingle(comp: (cache: Cache<string>) => ReactElement) {
	const [cache, value] = genCache<string>()

	const text = Math.random().toString()
	const r = render(comp(cache))
	act(() => value.next(text))
	await waitFor(() => {
		expect(r.getByTestId("test")).toHaveTextContent(text)
	})
}

async function testPair(comp: (cache1: Cache<String>, cache2: Cache<number>) => ReactElement) {
	const [cache1, value1] = genCache<string>()
	const [cache2, value2] = genCache<number>()

	const r = render(comp(cache1, cache2))
	const text = Math.random().toString()
	const num = Math.random()
	act(() => {
		value1.next(text)
		value2.next(num)
	})
	await waitFor(() => {
		expect(r.getByTestId("test")).toHaveTextContent(text)
		expect(r.getByTestId("test")).toHaveTextContent(num.toString())
	})
}

function genCache<T>(bufferSize: number = 1): [Cache<T>, Subject<T>] {
	const subject = new ReplaySubject<T>(bufferSize)
	const atom = Atom.create(createLoadingStateIdle<T>())
	const cache = new CacheImpl(atom, () => subject.pipe(first()).toPromise())
	return [cache, subject]
}
