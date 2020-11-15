/*
import { Atom } from "@rixio/rxjs-atom"
import { act, render, waitFor, fireEvent } from "@testing-library/react"
import React, { ReactElement, useRef } from "react"
import { ReplaySubject, Subject } from "rxjs"
import { first } from "rxjs/operators"
import { R } from "@rixio/rxjs-react"
import { Cacheable } from "./cacheable"
import { createCacheStateIdle } from "./cache-state"
import { CacheImpl } from "./cache"

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
				<Cacheable cache={cache} />
			</span>
		))
	})

	test("should work without render props", async () => {
		await testSingle(cache => (
			<span data-testid="test">
				<Cacheable cache={cache}>
					<R.span>{cache.atom.lens("value")}</R.span>
				</Cacheable>
			</span>
		))
	})

	test("should work with some items", async () => {
		await testPair((cache1, cache2) => (
			<span data-testid="test">
				<Cacheable cache={[cache1, cache2]}>{([v1, v2]) => `${v1} ${v2}`}</Cacheable>
			</span>
		))
	})

	test("should work with some items without children", async () => {
		await testPair((cache1, cache2) => (
			<span data-testid="test">
				<Cacheable cache={[cache1, cache2]} />
			</span>
		))
	})

	test("should support reload with render prop", async () => {
		await testReload(cache => (
			<Cacheable cache={cache}>
				{(value, reload) => (
					<>
						<button onClick={reload}>reload</button>
						<span data-testid="test">{value}</span>
					</>
				)}
			</Cacheable>
		))
	})

	test("should support reload with reloadRef", async () => {
		const TestComp = ({ cache }: { cache: Cache<number> }) => {
			const reload = useRef<() => void>(() => {})
			return (
				<Cacheable cache={cache} reloadRef={reload}>
					{value => (
						<>
							<button onClick={() => reload.current()}>reload</button>
							<span data-testid="test">{value}</span>
						</>
					)}
				</Cacheable>
			)
		}

		await testReload(cache => <TestComp cache={cache} />)
	})

	test("should show error with working reload", async () => {
		const [cache1, value1] = genCache<string>(0)
		const [cache2, value2] = genCache<number>(0)

		const r = render(
			<span data-testid="test">
				<Cacheable
					cache={[cache1, cache2]}
					pending="pending"
					rejected={(_, load) => <button onClick={load}>reload</button>}
				/>
			</span>
		)
		expect(r.getByTestId("test")).toHaveTextContent("pending")
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
	const atom = Atom.create(createCacheStateIdle<T>())
	const cache = new CacheImpl(atom, () => subject.pipe(first()).toPromise())
	return [cache, subject]
}

async function testReload(comp: (cache: Cache<number>) => ReactElement) {
	let value = 0

	function getNext() {
		// eslint-disable-next-line no-plusplus
		return Promise.resolve(value++)
	}

	const atom = Atom.create(createCacheStateIdle<number>())
	const cache = new CacheImpl(atom, getNext)
	const r = render(comp(cache))
	await waitFor(() => {
		expect(r.getByTestId("test")).toHaveTextContent("0")
	})
	act(() => {
		fireEvent.click(r.getByText("reload"))
	})
	await waitFor(() => {
		expect(r.getByTestId("test")).toHaveTextContent("1")
	})
}
*/
